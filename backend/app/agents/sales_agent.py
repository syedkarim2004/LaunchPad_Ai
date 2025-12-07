"""
Sales Agent - Loan Discussion and Options
Uses Groq LLM for dynamic, personalized responses
"""
from typing import Dict, Any
import re
import random
from langchain.schema import HumanMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.llm_factory import conversational_llm


SALES_SYSTEM_PROMPT = """You are Shruti, a friendly loan sales assistant at NBFC Finance.

Your personality:
- Warm, helpful, and never pushy
- Clear and transparent about terms
- Use simple language, short paragraphs
- Light emojis occasionally (🙂, ✅) but don't overdo it
- Show empathy for financial concerns

Your task: Generate a personalized response for the loan sales scenario provided.

Guidelines:
- Keep responses concise (3-5 short paragraphs max)
- Always include disclaimers for estimates ("This is an estimate - final terms depend on verification")
- Never guarantee approval - use "likely eligible" or "estimates"
- If showing EMI, format clearly with bullet points
- For hesitation, be understanding and offer alternatives
- For questions, answer directly and helpfully

IMPORTANT: Generate ONLY the response message. No meta-commentary."""


class SalesAgent:
    """
    Sales Agent - Presents loan options clearly and helpfully.
    Empathetic, transparent, never pushy.
    """
    
    def _get_display_name(self, raw_name: str) -> str:
        """Get proper display name, avoiding greetings as names"""
        if not raw_name:
            return "there"
        greetings = ["hi", "hello", "hey", "hii", "hiii", "namaste"]
        first_name = raw_name.split()[0].lower()
        if first_name in greetings:
            return "there"
        return raw_name.split()[0]
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """
        Handle sales conversation - present loan offers with EMI calculations.
        """
        user_message = state.get("user_message", "")
        
        # Get customer name, handle edge cases
        raw_name = state.get("customer_name", "")
        customer_name = self._get_display_name(raw_name)
        
        # For new users these fields may be None; fall back to safe defaults
        pre_approved = state.get("pre_approved_limit") or 500000
        monthly_salary = state.get("monthly_salary") or 50000
        credit_score = state.get("credit_score") or 750
        
        # Get loan amount - first from state (set by master), then try to extract from message
        loan_amount = state.get("loan_amount") or self._extract_amount(user_message)
        tenure = self._extract_tenure(user_message) or state.get("tenure_months")
        purpose = self._extract_purpose(user_message) or state.get("loan_purpose")
        
        # Debug logging
        print(f"[SALES] Amount: {loan_amount}, Pre-approved: {pre_approved}, Message: {user_message[:30]}...")
        
        updates = {}
        
        # Check user intent
        intent = self._analyze_sales_intent(user_message)
        
        # If user is hesitating or has concerns
        if intent == "hesitation":
            response = await self._handle_hesitation(customer_name, user_message, pre_approved)
            updates["bot_response"] = response
            updates["current_stage"] = "sales"
            updates["next_agent"] = "sales"
            return updates
        
        # If user is asking questions
        if intent == "question":
            response = await self._answer_question(customer_name, user_message, pre_approved, state)
            updates["bot_response"] = response
            updates["current_stage"] = "sales"
            updates["next_agent"] = "sales"
            return updates
        
        # If user agrees and EMI was already presented, proceed to next step
        emi_presented = state.get("emi_presented", False)
        application_status = state.get("application_status", "pending")
        
        if intent == "agreement" and loan_amount and emi_presented:
            # Route based on application status
            if application_status == "needs_documents":
                updates["next_agent"] = "document"
                updates["current_stage"] = "document_collection"
                updates["bot_response"] = f"""Great, {customer_name}! Since the amount is above your pre-approved limit, I'll need a few documents.

Let me guide you through the upload process..."""
            else:
                # Pre-approved or standard flow - go to verification
                updates["next_agent"] = "verification"
                updates["current_stage"] = "verification"
                updates["bot_response"] = f"""Great, {customer_name}! Let me verify your details quickly.

This will just take a moment..."""
            return updates
        
        # If amount is mentioned (either from state or extracted)
        if loan_amount:
            updates["loan_amount"] = loan_amount
            
            # Calculate interest rate based on amount and profile
            interest_rate = self._calculate_interest_rate(loan_amount, state)
            updates["interest_rate"] = interest_rate
            
            # Suggest optimal tenure based on salary
            if not tenure:
                tenure = self._suggest_tenure(loan_amount, monthly_salary)
            updates["tenure_months"] = tenure
            
            # Calculate EMI
            emi = self._calculate_emi(loan_amount, interest_rate, tenure)
            updates["emi_amount"] = emi
            
            # Store purpose if mentioned
            if purpose:
                updates["loan_purpose"] = purpose
            
            # Generate personalized response based on scenario
            response = await self._generate_offer_response(
                customer_name=customer_name,
                loan_amount=loan_amount,
                pre_approved=pre_approved,
                tenure=tenure,
                interest_rate=interest_rate,
                emi=emi,
                monthly_salary=monthly_salary,
                credit_score=credit_score,
                purpose=purpose
            )
            
            updates["bot_response"] = response
            updates["current_stage"] = "sales"
            updates["emi_presented"] = True  # Mark that EMI offer was shown
            updates["next_agent"] = "sales"  # Stay in sales to handle user response
            
            # Set application status based on amount vs pre-approved
            if loan_amount <= pre_approved:
                updates["application_status"] = "pre_approved"
            elif loan_amount <= pre_approved * 2:
                updates["application_status"] = "needs_documents"
            else:
                updates["application_status"] = "needs_negotiation"
        
        else:
            # No amount mentioned yet - engage in discovery
            response = await self._get_discovery_response(customer_name, pre_approved, user_message)
            updates["bot_response"] = response
            updates["current_stage"] = "sales"
            updates["next_agent"] = "sales"
        
        return updates
    
    def _analyze_sales_intent(self, message: str) -> str:
        """Analyze user's intent in sales context"""
        msg = message.lower().strip()
        
        # Check for amount first - if user provides amount, that's the main intent
        if self._extract_amount(message):
            return "amount_provided"
        
        # Agreement signals
        if msg in ["yes", "ok", "okay", "sure", "yep", "yeah", "fine", "alright", "proceed", "go ahead"]:
            return "agreement"
        
        # Strong agreement
        if any(phrase in msg for phrase in ["let's do", "lets do", "go ahead", "proceed", "i want", "i need"]):
            return "agreement"
        
        # Questions
        if "?" in msg or any(w in msg for w in ["what", "how", "why", "when", "tell me", "explain"]):
            return "question"
        
        # Hesitation (only clear hesitation)
        hesitation_phrases = ["expensive", "too high", "too much", "can't afford", "not sure", "think about", "maybe later"]
        if any(phrase in msg for phrase in hesitation_phrases):
            return "hesitation"
        
        return "general"
    
    def _extract_purpose(self, text: str) -> str:
        """Extract loan purpose from message"""
        msg = text.lower()
        
        purposes = {
            "car": ["car", "vehicle", "bike", "scooter"],
            "home": ["home", "house", "flat", "renovation", "interior"],
            "wedding": ["wedding", "marriage", "shaadi"],
            "education": ["education", "study", "college", "course"],
            "medical": ["medical", "hospital", "treatment", "surgery"],
            "travel": ["travel", "vacation", "trip", "holiday"],
            "business": ["business", "startup", "shop"],
            "debt_consolidation": ["debt", "loan", "emi", "consolidate"],
            "emergency": ["emergency", "urgent", "immediate"]
        }
        
        for purpose, keywords in purposes.items():
            if any(k in msg for k in keywords):
                return purpose
        
        return None
    
    def _suggest_tenure(self, amount: float, salary: float) -> int:
        """Suggest optimal tenure based on affordability"""
        # Target EMI should be around 30-40% of salary
        target_emi = salary * 0.35
        
        # Calculate tenure needed for target EMI (approximate)
        # Using simple calculation: tenure = amount / (target_emi * 0.9)
        suggested_tenure = int(amount / (target_emi * 0.9))
        
        # Round to nearest 12 months and cap between 12-60
        suggested_tenure = max(12, min(60, (suggested_tenure // 12) * 12))
        
        return suggested_tenure
    
    async def _generate_offer_response(
        self, customer_name: str, loan_amount: float, pre_approved: float,
        tenure: int, interest_rate: float, emi: float, monthly_salary: float,
        credit_score: int, purpose: str
    ) -> str:
        """Generate clear, helpful offer response using LLM"""
        
        emi_to_salary_ratio = (emi / monthly_salary) * 100 if monthly_salary else 0
        years = tenure // 12
        tenure_text = f"{years} year{'s' if years > 1 else ''}" if tenure >= 12 else f"{tenure} months"
        
        # Determine scenario
        if loan_amount <= pre_approved:
            scenario_type = "pre_approved"
            scenario = f"""SCENARIO: Loan Amount Within Pre-Approved Limit

Customer: {customer_name}
Purpose: {purpose or 'Not specified'}
Requested Amount: ₹{loan_amount:,.0f}
Pre-approved Limit: ₹{pre_approved:,.0f}

Offer Details:
- Tenure: {tenure_text}
- Interest Rate: {interest_rate}% per year (estimated)
- Monthly EMI: ₹{emi:,.0f}
- EMI as % of income: {emi_to_salary_ratio:.0f}%

Generate a friendly response presenting this offer. Mention:
1. The loan details clearly
2. EMI is comfortable relative to income
3. Add disclaimer about estimates
4. Next step is KYC verification - ask if they want to proceed"""
        
        elif loan_amount <= pre_approved * 2:
            scenario_type = "needs_documents"
            scenario = f"""SCENARIO: Loan Amount Above Pre-Approved (Needs Documents)

Customer: {customer_name}
Requested Amount: ₹{loan_amount:,.0f}
Pre-approved Limit: ₹{pre_approved:,.0f}

Offer Details:
- Tenure: {tenure_text}
- Interest Rate: {interest_rate}% per year (estimated)
- Monthly EMI: ₹{emi:,.0f}

Generate a response explaining:
1. The offer details
2. Amount is above pre-approved, so documents needed (salary slip, Aadhaar, PAN)
3. Approval usually takes 24 hours after documents
4. Add disclaimer about estimates
5. Ask if they want to proceed with documents"""
        
        else:
            scenario_type = "too_high"
            suggested_amount = min(pre_approved * 1.5, loan_amount * 0.7)
            suggested_emi = self._calculate_emi(suggested_amount, interest_rate, tenure)
            pre_approved_emi = self._calculate_emi(pre_approved, interest_rate - 0.5, tenure)
            
            scenario = f"""SCENARIO: Loan Amount Too High - Offer Alternatives

Customer: {customer_name}
Requested Amount: ₹{loan_amount:,.0f}
Pre-approved Limit: ₹{pre_approved:,.0f}

Be upfront that the requested amount is too high. Offer alternatives:
Option 1: ₹{suggested_amount:,.0f} with EMI ~₹{suggested_emi:,.0f}/month (needs income verification)
Option 2: ₹{pre_approved:,.0f} with EMI ~₹{pre_approved_emi:,.0f}/month (minimal docs)

Mention they can get top-up after 6-12 months of repayment.
Ask which option they'd like to explore."""
        
        # Generate response using LLM
        try:
            messages = [
                SystemMessage(content=SALES_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await conversational_llm.ainvoke(messages)
            return llm_response.content.strip()
        except Exception as e:
            print(f"[SALES] LLM error: {e}")
            # Fallback to simple response
            return f"""Here's what I can offer for ₹{loan_amount:,.0f}:

- **Tenure**: {tenure_text}
- **Interest rate**: {interest_rate}% per year (estimated)
- **Monthly EMI**: ₹{emi:,.0f}

*This is an estimate - final terms depend on verification.*

Would you like to proceed?"""
    
    def _get_purpose_comment(self, purpose: str) -> str:
        """Get a brief, warm comment based on loan purpose"""
        comments = {
            "car": "A car - nice! 🙂",
            "home": "Home expenses - that's a big step!",
            "wedding": "Congratulations on the wedding! 🙂",
            "education": "Education - great investment.",
            "medical": "I'll try to make this quick for you.",
            "travel": "A trip sounds great!",
            "business": "Business funding - exciting!",
            "emergency": "I understand this is urgent. Let me help.",
            "debt_consolidation": "Consolidating debt can be a smart move."
        }
        return comments.get(purpose, "")
    
    async def _handle_hesitation(self, name: str, message: str, pre_approved: float) -> str:
        """Handle customer concerns with empathy using LLM"""
        scenario = f"""SCENARIO: Customer Hesitation

Customer: {name}
Their Message: "{message}"
Pre-approved Amount: ₹{pre_approved:,.0f} if {pre_approved} else "Not available"

The customer is hesitating. Generate an empathetic response that:
1. Acknowledges their concern
2. Provides helpful context (e.g., rate comparison if about rates)
3. Offers alternatives or more information
4. No pressure - let them know it's okay to take time
5. Keep it brief and supportive"""
        
        try:
            messages = [
                SystemMessage(content=SALES_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await conversational_llm.ainvoke(messages)
            return llm_response.content.strip()
        except Exception as e:
            print(f"[SALES] LLM error in hesitation: {e}")
            return f"I understand, {name}. Take your time - no pressure at all. Let me know if you have any questions."
    
    async def _answer_question(self, name: str, question: str, pre_approved: float, state: dict) -> str:
        """Answer customer questions using LLM"""
        loan_amount = state.get("loan_amount", 0)
        
        scenario = f"""SCENARIO: Customer Question

Customer: {name}
Their Question: "{question}"
Pre-approved Amount: ₹{pre_approved:,.0f}
Current Loan Amount (if any): ₹{loan_amount:,.0f}

Answer their question helpfully. Common topics:
- EMI: Explain factors (amount, tenure, rate), give examples if pre-approved amount available
- Interest rates: Range from 10.5% to 16% based on credit score
- Documents: Aadhaar, PAN required; salary slip for higher amounts
- Timeline: Pre-approved = same day, higher amounts = 24-48 hours

Keep response concise and helpful. Offer to calculate specific numbers if relevant."""
        
        try:
            messages = [
                SystemMessage(content=SALES_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await conversational_llm.ainvoke(messages)
            return llm_response.content.strip()
        except Exception as e:
            print(f"[SALES] LLM error in question: {e}")
            return f"Great question, {name}! Let me help you with that. Could you tell me more about what you'd like to know?"
    
    async def _get_discovery_response(self, name: str, pre_approved: float, message: str) -> str:
        """Engage customer in discovery using LLM"""
        scenario = f"""SCENARIO: Discovery - Need Loan Amount

Customer: {name}
Their Message: "{message}"
Pre-approved Amount: ₹{pre_approved:,.0f} if {pre_approved} else "Not determined yet"

The customer hasn't mentioned a specific loan amount. Generate a friendly response that:
1. Asks how much they're looking for
2. Optionally asks what it's for (helps suggest tenure)
3. If pre-approved amount available, mention they're likely eligible for up to that amount
4. Keep it brief and conversational"""
        
        try:
            messages = [
                SystemMessage(content=SALES_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await conversational_llm.ainvoke(messages)
            return llm_response.content.strip()
        except Exception as e:
            print(f"[SALES] LLM error in discovery: {e}")
            if pre_approved and pre_approved > 0:
                return f"How much are you looking for, {name}? Based on your profile, you're likely eligible for up to ₹{pre_approved:,.0f}."
            return f"How much are you looking for, {name}? Once I know, I can give you specific options."
    
    def _extract_amount(self, text: str) -> float:
        """Extract loan amount from user message"""
        text = text.lower()
        
        # Pattern for lakhs (e.g., "5 lakhs", "5 lakh", "5L")
        lakh_pattern = r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b'
        lakh_match = re.search(lakh_pattern, text)
        if lakh_match:
            return float(lakh_match.group(1)) * 100000
        
        # Pattern for thousands (e.g., "50000", "50k")
        thousand_pattern = r'(\d+)k\b'
        thousand_match = re.search(thousand_pattern, text)
        if thousand_match:
            return float(thousand_match.group(1)) * 1000
        
        # Pattern for direct numbers with ₹ or Rs
        rupee_pattern = r'[₹rs\.]\s*(\d+(?:,\d+)*(?:\.\d+)?)'
        rupee_match = re.search(rupee_pattern, text)
        if rupee_match:
            amount_str = rupee_match.group(1).replace(',', '')
            return float(amount_str)
        
        # Pattern for plain large numbers (likely amounts)
        number_pattern = r'\b(\d{5,})\b'
        number_match = re.search(number_pattern, text)
        if number_match:
            return float(number_match.group(1))
        
        return None
    
    def _extract_tenure(self, text: str) -> int:
        """Extract loan tenure from user message"""
        text = text.lower()
        
        # Pattern for years
        year_pattern = r'(\d+)\s*(?:year|years|yr|yrs)\b'
        year_match = re.search(year_pattern, text)
        if year_match:
            return int(year_match.group(1)) * 12
        
        # Pattern for months
        month_pattern = r'(\d+)\s*(?:month|months|mon)\b'
        month_match = re.search(month_pattern, text)
        if month_match:
            return int(month_match.group(1))
        
        return None
    
    def _calculate_interest_rate(self, amount: float, state: LoanApplicationState) -> float:
        """Calculate interest rate based on amount and customer profile"""
        # Coerce possible None values to sensible defaults
        credit_score = state.get("credit_score") or 700
        pre_approved = state.get("pre_approved_limit") or 0
        
        # Base rate
        base_rate = 10.5
        
        # Adjust based on credit score
        if credit_score >= 800:
            base_rate -= 1.5
        elif credit_score >= 750:
            base_rate -= 1.0
        elif credit_score >= 700:
            base_rate -= 0.5
        
        # Adjust based on amount vs pre-approved
        if pre_approved and amount > pre_approved:
            base_rate += 1.0
        
        return round(base_rate, 2)
    
    def _calculate_emi(self, principal: float, rate: float, tenure: int) -> float:
        """Calculate EMI using reducing balance method"""
        monthly_rate = rate / (12 * 100)
        
        if monthly_rate == 0:
            return principal / tenure
        
        emi = principal * monthly_rate * (1 + monthly_rate)**tenure / ((1 + monthly_rate)**tenure - 1)
        return round(emi, 2)


# Singleton instance
sales_agent = SalesAgent()
