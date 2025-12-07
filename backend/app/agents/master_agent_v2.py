"""
Master Agent v2 - Simplified, Robust Conversation Handler
Shruti - AI Loan Assistant

Key Principles:
1. Simple state machine with clear transitions
2. Extract information from ANY message format
3. Never repeat the same response
4. Always move the conversation forward
"""
from typing import Dict, Any, Optional, Tuple
import re
from app.agents.state import LoanApplicationState


class MasterAgentV2:
    """
    Simplified Master Agent with robust intent detection and state management.
    """
    
    def __init__(self):
        self.name = "Shruti"
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """Main entry point - process user message and return updates"""
        user_message = state.get("user_message", "").strip()
        current_stage = state.get("current_stage", "greeting")
        
        # Get customer name (handle edge cases)
        raw_name = state.get("customer_name", "")
        customer_name = self._get_display_name(raw_name)
        
        # Debug logging
        print(f"[MASTER v2] Stage: {current_stage}, Message: {user_message[:50]}...")
        
        # Handle onboarding first (collecting name, phone, age)
        if state.get("needs_onboarding", False):
            return await self._handle_onboarding(state, user_message)
        
        # Extract any useful information from the message
        extracted = self._extract_all_info(user_message)
        print(f"[MASTER v2] Extracted: {extracted}")
        
        # Determine what to do based on current stage and extracted info
        response, next_stage, next_agent, updates = self._decide_action(
            state, user_message, extracted, current_stage, customer_name
        )
        
        # Build final updates
        final_updates = {
            "bot_response": response,
            "current_stage": next_stage,
            "next_agent": next_agent,
            **updates
        }
        
        return final_updates
    
    def _get_display_name(self, raw_name: str) -> str:
        """Get a proper display name, handling edge cases"""
        if not raw_name:
            return "there"
        
        # Don't use common greetings as names
        greetings = ["hi", "hello", "hey", "hii", "hiii", "namaste", "good morning", "good evening"]
        first_name = raw_name.split()[0].lower()
        
        if first_name in greetings:
            return "there"
        
        return raw_name.split()[0]
    
    def _extract_all_info(self, message: str) -> Dict[str, Any]:
        """Extract all possible information from a message"""
        msg = message.lower().strip()
        extracted = {}
        
        # Extract amount (various formats)
        amount = self._extract_amount(message)
        if amount:
            extracted["amount"] = amount
        
        # Extract loan purpose
        purpose = self._extract_purpose(msg)
        if purpose:
            extracted["purpose"] = purpose
        
        # Extract tenure
        tenure = self._extract_tenure(msg)
        if tenure:
            extracted["tenure"] = tenure
        
        # Detect intent
        extracted["intent"] = self._detect_intent(msg, message)
        
        # Detect sentiment
        extracted["sentiment"] = self._detect_sentiment(msg)
        
        return extracted
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract loan amount from message"""
        text_lower = text.lower()
        
        # Pattern: X lakh/lakhs/lac
        lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|l)\b', text_lower)
        if lakh_match:
            return float(lakh_match.group(1)) * 100000
        
        # Pattern: Xk (thousands)
        k_match = re.search(r'(\d+)\s*k\b', text_lower)
        if k_match:
            return float(k_match.group(1)) * 1000
        
        # Pattern: ₹X or Rs X or Rs.X
        rupee_match = re.search(r'[₹rs\.]+\s*(\d[\d,]*)', text_lower)
        if rupee_match:
            return float(rupee_match.group(1).replace(',', ''))
        
        # Pattern: Plain large number (5+ digits, likely an amount)
        plain_match = re.search(r'\b(\d{5,7})\b', text)
        if plain_match:
            return float(plain_match.group(1))
        
        # Pattern: Smaller number that could be amount in context
        # Only if message seems to be about amount
        if any(w in text_lower for w in ["need", "want", "loan", "amount", "looking"]):
            small_match = re.search(r'\b(\d{4,})\b', text)
            if small_match:
                return float(small_match.group(1))
        
        return None
    
    def _extract_purpose(self, msg: str) -> Optional[str]:
        """Extract loan purpose from message"""
        purposes = {
            "home": ["home", "house", "flat", "apartment", "property", "renovation", "interior"],
            "car": ["car", "vehicle", "bike", "scooter", "two wheeler", "auto"],
            "wedding": ["wedding", "marriage", "shaadi"],
            "education": ["education", "study", "college", "university", "course", "tuition"],
            "medical": ["medical", "hospital", "treatment", "surgery", "health", "doctor"],
            "travel": ["travel", "vacation", "trip", "holiday", "tour"],
            "business": ["business", "startup", "shop", "enterprise"],
            "personal": ["personal", "emergency", "urgent"]
        }
        
        for purpose, keywords in purposes.items():
            if any(k in msg for k in keywords):
                return purpose
        return None
    
    def _extract_tenure(self, msg: str) -> Optional[int]:
        """Extract tenure in months"""
        # Years
        year_match = re.search(r'(\d+)\s*(?:year|years|yr|yrs)', msg)
        if year_match:
            return int(year_match.group(1)) * 12
        
        # Months
        month_match = re.search(r'(\d+)\s*(?:month|months|mon)', msg)
        if month_match:
            return int(month_match.group(1))
        
        return None
    
    def _detect_intent(self, msg: str, original: str) -> str:
        """Detect user intent with priority ordering"""
        
        # Check for amount first (highest priority for moving forward)
        if self._extract_amount(original):
            return "amount_provided"
        
        # Strong agreement/readiness signals
        agreement_phrases = [
            "made up my mind", "make up my mind", "decided", "i'm ready", "im ready",
            "let's do it", "lets do it", "go ahead", "proceed", "yes please",
            "definitely", "absolutely", "sure", "okay let's", "ok let's",
            "i want to", "i need to", "i am ready", "i'm good", "im good",
            "sounds good", "that works", "perfect", "great"
        ]
        if any(phrase in msg for phrase in agreement_phrases):
            return "agreement"
        
        # Loan need/interest
        if any(w in msg for w in ["need", "want", "require", "looking for"]) and \
           any(w in msg for w in ["loan", "money", "funds", "finance", "credit"]):
            return "loan_need"
        
        # Just mentioning loan
        if any(w in msg for w in ["loan", "borrow", "finance", "credit"]):
            return "loan_inquiry"
        
        # Simple yes/ok
        if msg in ["yes", "ok", "okay", "sure", "yep", "yeah", "yea", "fine", "alright"]:
            return "simple_yes"
        
        # Questions
        if "?" in msg or any(w in msg for w in ["what", "how", "why", "when", "which", "tell me", "explain"]):
            return "question"
        
        # Hesitation (only clear hesitation phrases)
        hesitation_phrases = ["not sure", "maybe later", "think about it", "let me think", 
                            "too expensive", "too high", "can't afford"]
        if any(phrase in msg for phrase in hesitation_phrases):
            return "hesitation"
        
        # Simple no (only if standalone)
        if msg in ["no", "nope", "nah", "not now", "not interested", "no thanks"]:
            return "decline"
        
        # Greeting
        if msg in ["hi", "hello", "hey", "hii", "hiii"] or msg.startswith(("hi ", "hello ", "hey ")):
            return "greeting"
        
        # Closing
        if any(w in msg for w in ["thank", "thanks", "bye", "goodbye"]):
            return "closing"
        
        return "general"
    
    def _detect_sentiment(self, msg: str) -> str:
        """Detect message sentiment"""
        positive = ["great", "good", "nice", "perfect", "excellent", "happy", "thanks", "wonderful", "love"]
        negative = ["bad", "expensive", "high", "worried", "confused", "difficult", "problem"]
        
        pos_count = sum(1 for w in positive if w in msg)
        neg_count = sum(1 for w in negative if w in msg)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        return "neutral"
    
    def _decide_action(
        self, 
        state: LoanApplicationState, 
        message: str, 
        extracted: Dict, 
        stage: str, 
        name: str
    ) -> Tuple[str, str, str, Dict]:
        """Decide what action to take based on state and extracted info"""
        
        intent = extracted.get("intent", "general")
        amount = extracted.get("amount")
        purpose = extracted.get("purpose")
        pre_approved = state.get("pre_approved_limit") or 0
        
        updates = {}
        
        # If amount is provided at ANY stage, capture it and move to sales
        if amount:
            updates["loan_amount"] = amount
            if purpose:
                updates["loan_purpose"] = purpose
            
            # Hand off to sales agent with the amount
            return None, "offer_presentation", "sales", updates
        
        # Handle based on current stage
        if stage == "greeting":
            return self._handle_greeting_stage(name, intent, purpose, pre_approved, updates)
        
        elif stage == "discovery":
            return self._handle_discovery_stage(name, intent, purpose, pre_approved, updates)
        
        elif stage == "persuasion":
            return self._handle_persuasion_stage(name, intent, purpose, pre_approved, message, updates)
        
        elif stage == "offer_presentation":
            # Should be handled by sales agent, but if we're here, route there
            return None, "offer_presentation", "sales", updates
        
        elif stage in ["verification", "underwriting", "sanction", "document_collection"]:
            # These stages are handled by other agents
            return None, stage, state.get("next_agent", "master"), updates
        
        # Default: ask for amount
        response = self._ask_for_amount(name, pre_approved)
        return response, "discovery", "master", updates
    
    def _handle_greeting_stage(self, name: str, intent: str, purpose: str, pre_approved: float, updates: Dict) -> Tuple[str, str, str, Dict]:
        """Handle greeting stage"""
        
        if intent in ["loan_need", "loan_inquiry", "agreement", "simple_yes"]:
            # User wants a loan - move to discovery
            response = self._ask_for_amount(name, pre_approved)
            return response, "discovery", "master", updates
        
        if purpose:
            # User mentioned a purpose - explain options
            response = self._explain_purpose_options(name, purpose, pre_approved)
            return response, "persuasion", "master", updates
        
        if intent == "greeting":
            response = f"""Hi {name}! I'm {self.name}, your loan assistant.

How can I help you today? Are you looking for a loan?"""
            return response, "greeting", "master", updates
        
        # Default greeting response
        response = f"""Hi {name}! What can I help you with today?

Are you looking for a personal loan, or would you like to know more about your options?"""
        return response, "discovery", "master", updates
    
    def _handle_discovery_stage(self, name: str, intent: str, purpose: str, pre_approved: float, updates: Dict) -> Tuple[str, str, str, Dict]:
        """Handle discovery stage"""
        
        if intent in ["loan_need", "loan_inquiry", "agreement", "simple_yes"]:
            response = self._ask_for_amount(name, pre_approved)
            return response, "discovery", "master", updates
        
        if purpose:
            response = self._explain_purpose_options(name, purpose, pre_approved)
            return response, "persuasion", "master", updates
        
        if intent == "question":
            response = f"""Sure, {name}! I can help with:
- EMI calculations
- Interest rates (typically 10.5% - 14%)
- Documents needed
- Approval timeline

What would you like to know? Or just tell me how much you need."""
            return response, "discovery", "master", updates
        
        # Default: ask for amount
        response = self._ask_for_amount(name, pre_approved)
        return response, "discovery", "master", updates
    
    def _handle_persuasion_stage(self, name: str, intent: str, purpose: str, pre_approved: float, message: str, updates: Dict) -> Tuple[str, str, str, Dict]:
        """Handle persuasion stage - user was shown purpose-specific info"""
        
        # Any positive signal = move forward
        if intent in ["agreement", "simple_yes", "loan_need", "loan_inquiry"]:
            response = self._ask_for_amount(name, pre_approved)
            return response, "offer_presentation", "sales", updates
        
        if intent == "hesitation":
            response = f"""No problem, {name}. Take your time.

If you have any questions about rates, EMIs, or the process, I'm happy to explain.

Or when you're ready, just tell me how much you're looking for."""
            return response, "persuasion", "master", updates
        
        if intent == "question":
            response = f"""Of course! What would you like to know?

I can explain interest rates, EMI calculations, documents needed, or the approval process."""
            return response, "persuasion", "master", updates
        
        # Default: assume they want to proceed, ask for amount
        response = self._ask_for_amount(name, pre_approved)
        return response, "offer_presentation", "sales", updates
    
    def _ask_for_amount(self, name: str, pre_approved: float) -> str:
        """Ask user for loan amount"""
        if pre_approved and pre_approved > 0:
            return f"""Great, {name}! How much are you looking for?

Based on your profile, you're likely eligible for up to ₹{pre_approved:,.0f}."""
        else:
            return f"""Sure, {name}! How much are you looking for?

Just give me a number and I'll show you what the EMI would look like."""
    
    def _explain_purpose_options(self, name: str, purpose: str, pre_approved: float) -> str:
        """Explain loan options for a specific purpose"""
        
        purpose_responses = {
            "home": f"""Home-related expenses - that's a big step, {name}!

For property purchase, a home loan usually makes sense (lower rates, longer tenure).

For down payment, registration, or interiors, a personal loan can be quicker:
- Faster approval (days, not weeks)
- Less paperwork

What specifically are you looking to cover? Or tell me the amount you need.""",

            "car": f"""A car - nice choice, {name}!

You have options:
- **Car loan**: Lower rate, but bank holds the car as collateral
- **Personal loan**: Slightly higher rate, but you own the car outright

How much are you looking for?""",

            "wedding": f"""Congratulations on the upcoming wedding, {name}! 🙂

Personal loans work well for weddings - use it for anything without justifying expenses.

How much do you need?""",

            "education": f"""Education - great investment, {name}!

Personal loans are flexible - use for any course, plus living expenses.

How much are you looking for?""",

            "medical": f"""I understand, {name}. Let me help you quickly.

Personal loans work well for medical expenses - quick approval, use at any hospital.

How much do you need?""",

            "business": f"""Business funding - exciting, {name}!

Personal loans are faster than business loans - based on your profile, less paperwork.

How much are you thinking?"""
        }
        
        return purpose_responses.get(purpose, self._ask_for_amount(name, pre_approved))
    
    async def _handle_onboarding(self, state: LoanApplicationState, message: str) -> Dict[str, Any]:
        """Handle onboarding flow - collect name, phone, age"""
        step = state.get("onboarding_step", "name")
        updates = {}
        
        # Check if message is a greeting (not a name)
        greetings = ["hi", "hello", "hey", "hii", "hiii", "namaste", "good morning", "good evening"]
        msg_lower = message.lower().strip()
        
        if step == "name":
            # Check if it's a greeting instead of a name
            if msg_lower in greetings:
                response = """Nice to meet you! What's your name?"""
                updates["onboarding_step"] = "name"
            else:
                # Accept as name
                name = message.strip().title()
                # Validate it looks like a name
                if len(name) >= 2 and len(name) <= 50 and not any(c.isdigit() for c in name):
                    updates["customer_name"] = name
                    first_name = name.split()[0]
                    response = f"""Nice to meet you, {first_name}!

Could you share your phone number? (10-digit mobile number)"""
                    updates["onboarding_step"] = "phone"
                else:
                    response = """I didn't catch that. What's your name?"""
                    updates["onboarding_step"] = "name"
        
        elif step == "phone":
            # Extract phone number
            phone_match = re.search(r'[6-9]\d{9}', message.replace(" ", "").replace("-", ""))
            if phone_match:
                phone = phone_match.group(0)
                updates["customer_phone"] = f"+91-{phone}"
                response = f"""Got it! ✅

What's your age?"""
                updates["onboarding_step"] = "age"
            else:
                response = """Please enter a valid 10-digit mobile number (e.g., 9876543210)"""
                updates["onboarding_step"] = "phone"
        
        elif step == "age":
            # Extract age
            age_match = re.search(r'\b(1[89]|[2-9]\d)\b', message)
            if age_match:
                age = int(age_match.group(0))
                updates["customer_age"] = age
                updates["needs_onboarding"] = False
                updates["onboarding_step"] = None
                updates["current_stage"] = "greeting"
                
                name = self._get_display_name(state.get("customer_name", ""))
                response = f"""Great, {name}! You're all set.

How can I help you today? Are you looking for a loan?"""
            else:
                response = """Please enter your age (must be 18 or older)."""
                updates["onboarding_step"] = "age"
        
        else:
            # Fallback
            updates["needs_onboarding"] = False
            updates["current_stage"] = "greeting"
            name = self._get_display_name(state.get("customer_name", ""))
            response = f"""Thanks! How can I help you today, {name}?"""
        
        updates["bot_response"] = response
        updates["next_agent"] = "master"
        if "current_stage" not in updates:
            updates["current_stage"] = "onboarding"
        
        return updates


# Singleton instance
master_agent_v2 = MasterAgentV2()
