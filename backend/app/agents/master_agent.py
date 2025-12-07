"""
Master Agent - Main Orchestrator (Shruti - Human-like AI Loan Assistant)
Manages conversation flow with warmth, empathy, and clarity.
Helps users explore loan options naturally without being pushy.

WORKFLOW:
1. Warm Greeting → Understand Intent
2. Gather Details → Step by Step
3. Present Options → Clear & Concise
4. Handle Concerns → Empathy First
5. Verify → KYC Check
6. Underwrite → Credit Assessment
7. Sanction → Generate Letter
8. Close → Recap & Next Steps
"""
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.llm_factory import conversational_llm


class MasterAgent:
    """
    Master Agent - Acts as Shruti, a warm and helpful AI loan assistant.
    Natural conversation, empathy-first, never pushy.
    """
    
    # Conversation stages
    STAGES = {
        "greeting": "Initial warm greeting and understanding intent",
        "discovery": "Gathering details step by step",
        "offer_presentation": "Presenting clear options",
        "objection_handling": "Addressing concerns with empathy",
        "verification": "KYC verification process",
        "underwriting": "Credit assessment and approval",
        "document_collection": "Collecting required documents",
        "sanction": "Final approval and letter generation",
        "closing": "Recap and next steps"
    }
    
    def __init__(self):
        self.llm = conversational_llm
        
        # Shruti persona system prompt
        self.system_prompt = """You are Shruti, an AI loan assistant for NBFC Finance.

PERSONALITY & TONE:
- Warm, smart, patient - like a helpful teammate
- Clear and conversational, not robotic or overly formal
- Use simple language, short paragraphs
- Light emojis occasionally (🙂, ✅) but don't overdo it
- Show empathy: acknowledge stress, celebrate good news
- Never shame or judge financial situations
- Avoid jargon; explain terms simply when needed

APPROACH:
1. Understand intent first - ask 1-2 simple questions
2. Gather details gradually, not all at once
3. Show 2-3 options max, not 10
4. Check understanding: "Does this make sense?"
5. Wrap up with clear next steps

WHAT YOU CAN DO:
- Explain loan types, rates, EMIs, fees
- Help explore eligibility based on income, credit, etc.
- Calculate EMI estimates
- Compare options (tenures, rates)
- Explain documentation and process

WHAT YOU MUST NOT DO:
- Claim to be human (say you're an AI if asked)
- Give guarantees (only "likely eligibility" or "estimates")
- Give legal/tax/investment advice
- Make up policies or rates you don't know

SAFETY:
- Be honest about uncertainty
- Add disclaimers for estimates
- If unsure, suggest talking to a loan officer

Current Stage: {stage}
Customer: {customer_name}
Context: {context}
"""
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """Process message with human-like conversation flow"""
        user_message = state.get("user_message", "")
        current_stage = state.get("current_stage", "greeting")
        customer_name = state.get("customer_name", "").split()[0] if state.get("customer_name") else "there"
        conversation_count = state.get("conversation_count", 0) + 1
        onboarding_step = state.get("onboarding_step")
        needs_onboarding = state.get("needs_onboarding", False)
        is_guest = state.get("is_guest", False)
        
        # Handle onboarding flow first - collect user details conversationally
        if current_stage == "onboarding" and needs_onboarding:
            return await self._handle_onboarding(state, user_message, onboarding_step, is_guest)
        
        # Analyze the message
        intent = self._analyze_intent(user_message, current_stage)
        sentiment = self._analyze_sentiment(user_message)
        mentioned_loan_type = self._detect_loan_type(user_message)
        
        # DEBUG LOGGING
        print(f"[MASTER AGENT] User: {user_message}")
        print(f"[MASTER AGENT] Stage: {current_stage}, Intent: {intent}, Loan Type: {mentioned_loan_type}")
        
        # Determine response and next stage
        response, next_stage, next_agent = await self._orchestrate_conversation(
            user_message=user_message,
            intent=intent,
            sentiment=sentiment,
            mentioned_loan_type=mentioned_loan_type,
            current_stage=current_stage,
            customer_name=customer_name,
            state=state,
            conversation_count=conversation_count
        )
        
        # DEBUG LOGGING
        print(f"[MASTER AGENT] Response: {response[:100] if response else 'None'}...")
        print(f"[MASTER AGENT] Next Stage: {next_stage}, Next Agent: {next_agent}")
        
        # Build updates
        updates = {
            "bot_response": response,
            "user_intent": intent,
            "current_stage": next_stage,
            "next_agent": next_agent,
            "conversation_count": conversation_count,
            "messages": state.get("messages", []) + [
                HumanMessage(content=user_message),
                AIMessage(content=response)
            ]
        }
        
        if mentioned_loan_type:
            updates["mentioned_loan_type"] = mentioned_loan_type
        
        return updates
    
    def _analyze_intent(self, message: str, stage: str) -> str:
        """Analyze user intent from message - order matters for priority"""
        msg = message.lower().strip()
        
        # PRIORITY 1: Check for loan inquiry/need FIRST (even if message has "no" in it)
        # "no no i need a loan" should be loan_inquiry, not hesitation
        loan_keywords = ["loan", "borrow", "finance", "credit"]
        need_keywords = ["need", "want", "require", "looking for", "interested in"]
        
        has_loan_keyword = any(w in msg for w in loan_keywords)
        has_need_keyword = any(w in msg for w in need_keywords)
        
        if has_loan_keyword and has_need_keyword:
            return "loan_inquiry"
        
        # PRIORITY 2: Strong agreement signals (override hesitation words)
        # "made up my mind", "decided", "ready", "let's do it"
        strong_agreement = ["made up my mind", "make up my mind", "decided", "i'm ready", 
                          "im ready", "let's do it", "lets do it", "go ahead", "proceed",
                          "i want to", "i need to", "yes please", "definitely", "absolutely"]
        if any(phrase in msg for phrase in strong_agreement):
            return "agreement"
        
        # PRIORITY 3: Loan inquiry (just mentioning loan)
        if has_loan_keyword:
            return "loan_inquiry"
        
        # PRIORITY 4: Specific purposes
        if any(w in msg for w in ["car", "vehicle", "bike", "two wheeler"]):
            return "car_loan_interest"
        if any(w in msg for w in ["home", "house", "flat", "apartment", "property"]):
            return "home_loan_interest"
        if any(w in msg for w in ["education", "study", "college", "university", "course"]):
            return "education_loan_interest"
        if any(w in msg for w in ["wedding", "marriage", "shaadi"]):
            return "wedding_expense"
        if any(w in msg for w in ["medical", "hospital", "treatment", "surgery", "health"]):
            return "medical_expense"
        if any(w in msg for w in ["business", "startup", "shop"]):
            return "business_loan_interest"
        
        # PRIORITY 5: Amount mentioned
        import re
        if any(w in msg for w in ["lakh", "thousand", "₹", "rs", "rupees", "lac"]):
            return "amount_mentioned"
        # Check for standalone numbers (likely amounts)
        if re.search(r'\b\d{4,}\b', msg):  # 4+ digit numbers
            return "amount_mentioned"
        
        # PRIORITY 6: Simple agreement
        if any(w in msg for w in ["yes", "sure", "okay", "ok", "continue", "sounds good", "fine", "alright"]):
            return "agreement"
        
        # PRIORITY 7: Greetings (lower priority - don't override loan intent)
        if msg in ["hi", "hello", "hey"] or msg.startswith(("hi ", "hello ", "hey ")):
            return "greeting"
        
        # PRIORITY 8: Questions
        if any(w in msg for w in ["what", "how", "why", "when", "where", "which", "?"]):
            return "question"
        
        # PRIORITY 9: Document related
        if any(w in msg for w in ["document", "upload", "aadhaar", "pan", "salary slip", "bank statement"]):
            return "document_related"
        
        # PRIORITY 10: Thanks/Closing
        if any(w in msg for w in ["thank", "thanks", "bye", "goodbye"]):
            return "closing"
        
        # PRIORITY 11: Hesitation (only if nothing else matches)
        # Be careful - "no" at start followed by positive intent should not be hesitation
        hesitation_only = ["not sure", "maybe later", "think about it", "let me think", 
                         "i'll think", "expensive", "too high", "too much"]
        if any(phrase in msg for phrase in hesitation_only):
            return "hesitation"
        
        # Simple "no" only counts as hesitation if it's a short response
        if msg in ["no", "nope", "nah", "not now", "not interested"]:
            return "hesitation"
        
        return "general"
    
    def _analyze_sentiment(self, message: str) -> str:
        """Analyze sentiment of message"""
        msg = message.lower()
        
        positive_words = ["great", "good", "nice", "perfect", "excellent", "happy", "thanks", "wonderful", "amazing"]
        negative_words = ["bad", "expensive", "high", "worried", "concerned", "problem", "issue", "difficult", "confused"]
        
        positive_count = sum(1 for w in positive_words if w in msg)
        negative_count = sum(1 for w in negative_words if w in msg)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        return "neutral"
    
    def _detect_loan_type(self, message: str) -> str:
        """Detect if user mentions a specific loan type"""
        msg = message.lower()
        
        if any(w in msg for w in ["car", "vehicle", "bike", "two wheeler", "auto"]):
            return "car"
        if any(w in msg for w in ["home", "house", "flat", "apartment", "property"]):
            return "home"
        if any(w in msg for w in ["education", "study", "college", "university"]):
            return "education"
        if any(w in msg for w in ["wedding", "marriage"]):
            return "wedding"
        if any(w in msg for w in ["medical", "hospital", "treatment"]):
            return "medical"
        if any(w in msg for w in ["business", "startup"]):
            return "business"
        
        return None
    
    async def _orchestrate_conversation(
        self,
        user_message: str,
        intent: str,
        sentiment: str,
        mentioned_loan_type: str,
        current_stage: str,
        customer_name: str,
        state: LoanApplicationState,
        conversation_count: int
    ) -> tuple:
        """Orchestrate the conversation flow like a human sales executive"""
        
        pre_approved = state.get("pre_approved_limit", 500000)
        loan_amount = state.get("loan_amount", 0)
        
        # PRIORITY CHECK: If user mentions a specific loan type (car, home, etc.), 
        # ALWAYS go to persuasion - regardless of current stage
        if mentioned_loan_type and current_stage in ["greeting", "discovery"]:
            response = self._get_persuasion_response(customer_name, mentioned_loan_type, pre_approved)
            return response, "persuasion", "master"
        
        # STAGE 1: GREETING (Only for pure greetings like "hi", "hello")
        if current_stage == "greeting" and intent == "greeting":
            response = self._get_greeting_response(customer_name, intent, user_message)
            return response, "discovery", "master"
        
        # If in greeting stage but user says something substantive, move to discovery
        if current_stage == "greeting":
            # User said something other than greeting, treat as discovery
            if intent in ["loan_inquiry", "amount_mentioned"]:
                response = self._get_discovery_response(customer_name, user_message, pre_approved)
                return response, "offer_presentation", "sales"
            else:
                # Move to discovery and ask what they need
                response = self._get_discovery_followup(customer_name)
                return response, "discovery", "master"
        
        # STAGE 2: DISCOVERY - Understanding needs
        if current_stage == "discovery":
            # If they mention loan/money need
            if intent in ["loan_inquiry", "amount_mentioned"]:
                response = self._get_discovery_response(customer_name, user_message, pre_approved)
                return response, "offer_presentation", "sales"
            
            # Keep discovering
            response = self._get_discovery_followup(customer_name)
            return response, "discovery", "master"
        
        # STAGE 3: PERSUASION - Converting other loan interests to personal loan
        if current_stage == "persuasion":
            # User agrees or shows clear intent to proceed
            if intent in ["agreement", "loan_inquiry"]:
                if pre_approved and pre_approved > 0:
                    response = f"""Great, {customer_name}! Based on your profile, you're likely eligible for up to ₹{pre_approved:,.0f}.

How much are you looking for? I can show you what the EMI would look like."""
                else:
                    response = f"""Great, {customer_name}! How much are you looking for? I can show you what the options might look like."""
                return response, "offer_presentation", "sales"
            
            # User mentions a specific amount - move to sales
            elif intent == "amount_mentioned":
                return None, "offer_presentation", "sales"
            
            elif intent == "hesitation":
                response = self._get_objection_handling_response(customer_name, user_message, mentioned_loan_type)
                return response, "persuasion", "master"
            
            else:
                # Continue persuasion for other intents
                response = self._get_persuasion_followup(customer_name, mentioned_loan_type, pre_approved)
                return response, "persuasion", "master"
        
        # STAGE 4: OFFER PRESENTATION - Hand over to Sales Agent
        if current_stage == "offer_presentation":
            return None, "offer_presentation", "sales"
        
        # STAGE 5: OBJECTION HANDLING
        if intent == "hesitation" or sentiment == "negative":
            response = self._get_objection_handling_response(customer_name, user_message, mentioned_loan_type)
            return response, current_stage, "master"
        
        # STAGE 6: VERIFICATION - Hand over to Verification Agent
        if current_stage == "verification" or intent == "agreement" and state.get("loan_amount"):
            return None, "verification", "verification"
        
        # STAGE 7: DOCUMENT COLLECTION
        if current_stage == "document_collection" or intent == "document_related":
            return None, "document_collection", "document"
        
        # STAGE 8: UNDERWRITING
        if current_stage == "underwriting":
            return None, "underwriting", "underwriting"
        
        # STAGE 9: SANCTION
        if current_stage == "sanction":
            return None, "sanction", "sanction"
        
        # STAGE 10: CLOSING
        if intent == "closing":
            response = f"""You're welcome, {customer_name}! 

If you have any questions later, feel free to come back. I'm always here to help.

Take care! 🙂"""
            return response, "closing", "completed"
        
        # FALLBACK: If user shows loan intent at any stage, move to sales
        if intent in ["loan_inquiry", "agreement", "amount_mentioned"]:
            if pre_approved and pre_approved > 0:
                response = f"""Sure, {customer_name}! Based on your profile, you're likely eligible for up to ₹{pre_approved:,.0f}.

How much are you looking for?"""
            else:
                response = f"""Sure, {customer_name}! How much are you looking for? I can show you what options might work."""
            return response, "offer_presentation", "sales"
        
        # Default: Continue conversation naturally
        response = self._get_contextual_response(customer_name, user_message, current_stage, state)
        return response, current_stage, "master"
    
    def _get_greeting_response(self, name: str, intent: str, message: str) -> str:
        """Generate warm, natural greeting"""
        import random
        
        greetings = [
            f"""Hi {name}! I'm Shruti, your loan assistant here at NBFC Finance 🙂

What brings you here today? Are you looking for a loan, or just exploring your options?""",
            
            f"""Hey {name}! Welcome to NBFC Finance.

I'm Shruti, and I'm here to help you with any loan-related questions. What can I help you with today?""",
            
            f"""Hello {name}! 

I'm Shruti from NBFC Finance. Whether you need a loan or just want to understand your options, I'm happy to help.

What's on your mind?"""
        ]
        
        return random.choice(greetings)
    
    def _get_discovery_response(self, name: str, message: str, pre_approved: float) -> str:
        """Response when user shows loan interest"""
        if pre_approved and pre_approved > 0:
            return f"""Got it, {name}! Let me help you figure this out.

A couple of quick questions:
- How much are you looking for? (Even a rough idea helps)
- What's it for? This helps me suggest the right repayment period.

By the way, based on your profile, you're likely eligible for up to ₹{pre_approved:,.0f}. But let's first understand what you actually need 🙂"""
        else:
            return f"""Got it, {name}! Let me help you figure this out.

A couple of quick questions:
- How much are you looking for?
- What's it for? (This helps me suggest the right repayment period)

Once I know a bit more, I can give you a clearer picture of your options."""
    
    def _get_discovery_followup(self, name: str) -> str:
        """Follow-up when still in discovery phase"""
        import random
        
        responses = [
            f"""No problem, {name}! Take your time.

Is there something specific you're looking for? Maybe a car, home expenses, education, or something else?

I'm happy to help you explore your options - no commitment needed.""",
            
            f"""Sure thing, {name}!

What brings you here today? Even if you're just exploring, I can give you a rough idea of what might work for you."""
        ]
        
        return random.choice(responses)
    
    def _get_persuasion_response(self, name: str, loan_type: str, pre_approved: float) -> str:
        """Explain personal loan benefits for specific purposes - informative, not pushy"""
        
        pre_approved_text = f"Based on your profile, you're likely eligible for around ₹{pre_approved:,.0f}." if pre_approved and pre_approved > 0 else ""
        
        responses = {
            "car": f"""A car! That's a great goal, {name} 🙂

You have a couple of options here:
- **Car loan**: Usually 8-12% interest, but the bank holds the car as collateral until you pay it off
- **Personal loan**: Slightly higher rate (10-12%), but you own the car outright from day one

Personal loans also give you flexibility - you can use part of it for registration, insurance, or accessories.

{pre_approved_text}

Would you like me to show you what the EMI might look like for a specific amount?""",
            
            "home": f"""Home-related expenses - that's a big step, {name}!

For the actual property purchase, a home loan usually makes sense (lower rates, longer tenure).

But for things like down payment, registration, interiors, or moving costs, a personal loan can be quicker and simpler:
- Faster approval (days, not weeks)
- Less paperwork
- No property evaluation needed

{pre_approved_text}

What specifically are you looking to cover?""",
            
            "education": f"""Education is a great investment, {name} �

Here's a quick comparison:
- **Education loan**: Often tied to specific institutions, may need a co-applicant
- **Personal loan**: More flexible - use it for any course, plus living expenses

{pre_approved_text}

What are you planning to study? That'll help me give you a better idea of what might work.""",
            
            "wedding": f"""Congratulations on the upcoming wedding, {name}! 🙂

Personal loans work well for weddings because you can use the funds for anything - venue, catering, jewelry, honeymoon - without having to justify each expense.

{pre_approved_text}

Do you have a rough budget in mind? I can show you what the monthly payments might look like.""",
            
            "medical": f"""I understand, {name}. Medical expenses can be stressful, and I want to help you sort this out quickly.

Personal loans are often a good fit for medical needs:
- Quick approval (often same day)
- Use at any hospital
- Covers treatment, medicines, recovery

{pre_approved_text}

How much do you need? I'll try to make this as quick as possible.""",
            
            "business": f"""Starting or growing a business - that's exciting, {name}!

For business funding, you have options:
- **Business loan**: Requires business documents, projections, etc.
- **Personal loan**: Based on your personal profile, faster, less paperwork

Many people use personal loans to get started quickly.

{pre_approved_text}

What kind of amount are you thinking about?"""
        }
        
        return responses.get(loan_type, self._get_generic_persuasion(name, pre_approved))
    
    def _get_generic_persuasion(self, name: str, pre_approved: float) -> str:
        """Generic response when loan type is unclear"""
        if pre_approved and pre_approved > 0:
            return f"""Sure, {name}! Personal loans are pretty flexible - you can use them for almost anything.

Based on your profile, you're likely eligible for around ₹{pre_approved:,.0f}.

What do you need the funds for? That'll help me give you a better idea of the right amount and repayment period."""
        else:
            return f"""Sure, {name}! Personal loans are flexible - you can use them for almost anything.

What do you need the funds for? Once I know a bit more, I can give you a clearer picture of your options."""
    
    def _get_persuasion_followup(self, name: str, loan_type: str, pre_approved: float) -> str:
        """Follow-up during persuasion stage"""
        if pre_approved and pre_approved > 0:
            emi_estimate = int(pre_approved / 36 * 1.10)
            return f"""Take your time, {name} - no rush at all.

Just so you have a rough idea: for ₹{pre_approved:,.0f} over 3 years, the EMI would be approximately ₹{emi_estimate:,}/month.

(This is an estimate - the exact amount depends on the final rate and tenure.)

Any questions I can help with?"""
        else:
            return f"""Take your time, {name} - no rush at all.

If you'd like, I can show you some sample EMI calculations for different amounts. Just let me know what range you're thinking about."""
    
    def _get_objection_handling_response(self, name: str, message: str, loan_type: str) -> str:
        """Handle customer concerns with empathy"""
        msg = message.lower()
        
        if any(w in msg for w in ["expensive", "high", "rate", "interest"]):
            return f"""That's a fair concern, {name}. Interest rates are definitely something to think about carefully.

Our rates typically range from 10.5% to 14%, depending on your credit profile. For context:
- Credit cards charge 36-42% annually
- Many NBFCs charge 14-18%

A few things that might help:
- You can prepay anytime without penalty, which reduces total interest
- Shorter tenure = less total interest paid

Would it help if I showed you the exact numbers for a specific amount? That way you can see the actual cost."""
        
        elif any(w in msg for w in ["think", "later", "not sure"]):
            return f"""Of course, {name}. Take your time - this is an important decision.

If it helps, I can send you a summary of what we discussed. You can review it at your own pace and come back whenever you're ready.

Is there anything specific you'd like me to clarify before you go?"""
        
        elif any(w in msg for w in ["document", "paperwork", "hassle"]):
            return f"""I get it - paperwork can be a hassle.

The good news is we've kept it pretty simple:
- Aadhaar card (photo)
- PAN card
- Salary slip (only if you're applying for more than your pre-approved amount)

You can upload these right here in the chat. Most people finish in a few minutes.

Would you like to proceed, or do you have other questions first?"""
        
        else:
            return f"""I hear you, {name}.

Is there something specific on your mind? I'm happy to address any concerns or questions you have - no pressure at all."""
    
    def _get_contextual_response(self, name: str, message: str, stage: str, state: dict) -> str:
        """Generate contextual response based on conversation state"""
        return f"""I want to make sure I understand, {name}.

Could you tell me a bit more about what you're looking for? That'll help me give you better guidance."""
    
    async def _handle_onboarding(self, state: LoanApplicationState, user_message: str, step: str, is_guest: bool) -> Dict[str, Any]:
        """Handle conversational onboarding to collect user details"""
        import re
        
        updates = {}
        customer_name = state.get("customer_name", "Friend")
        first_name = customer_name.split()[0] if customer_name else "Friend"
        
        if step == "name":
            # Extract name from message
            name = user_message.strip().title()
            if len(name) > 1 and len(name) < 50 and not any(c.isdigit() for c in name):
                updates["customer_name"] = name
                first_name = name.split()[0]
                response = f"""Nice to meet you, {first_name}!

Could you share your phone number? I'll need it for verification later.

(Just your 10-digit mobile number)"""
                updates["onboarding_step"] = "phone"
            else:
                response = f"""I didn't quite catch that. Could you tell me your name?"""
                updates["onboarding_step"] = "name"
        
        elif step == "phone":
            # Extract phone number
            phone_match = re.search(r'\b[6-9]\d{9}\b', user_message.replace(" ", "").replace("-", ""))
            if phone_match:
                phone = phone_match.group(0)
                updates["customer_phone"] = f"+91-{phone}"
                response = f"""Got it! ✅

One more question - what's your age? This helps me find the right options for you."""
                updates["onboarding_step"] = "age"
            else:
                response = f"""That doesn't look like a valid phone number. Could you share your 10-digit mobile number?

For example: 9876543210"""
                updates["onboarding_step"] = "phone"
        
        elif step == "age":
            # Extract age
            age_match = re.search(r'\b(1[89]|[2-9]\d)\b', user_message)
            if age_match:
                age = int(age_match.group(0))
                updates["customer_age"] = age
                updates["needs_onboarding"] = False
                updates["onboarding_step"] = None
                updates["current_stage"] = "greeting"
                
                response = f"""Great, {first_name}! You're all set.

Now, how can I help you today? Are you looking for a loan, or just exploring your options?"""
            else:
                response = f"""I need your age to proceed. Just type a number like 25 or 32.

(You need to be 18 or older for a loan)"""
                updates["onboarding_step"] = "age"
        
        else:
            # Fallback
            updates["needs_onboarding"] = False
            updates["current_stage"] = "greeting"
            response = f"""Thanks, {first_name}!

How can I help you today? Are you looking for a loan?"""
        
        updates["bot_response"] = response
        if "current_stage" not in updates:
            updates["current_stage"] = "onboarding"
        updates["next_agent"] = "master"
        
        return updates


# Singleton instance
master_agent = MasterAgent()
