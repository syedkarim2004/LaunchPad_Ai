"""
Master Agent - LLM-Powered Conversation Handler
Uses OpenAI to generate natural, context-aware responses.

This replaces hardcoded templates with intelligent LLM-generated replies.
"""
from typing import Dict, Any, Optional, Tuple
import re
from app.agents.state import LoanApplicationState
from app.llm_factory import conversational_llm
from langchain_core.messages import HumanMessage, SystemMessage


class MasterAgentLLM:
    """
    Master Agent powered by LLM for natural conversation.
    Extracts information and uses LLM to generate contextual responses.
    """
    
    def __init__(self):
        self.name = "Shruti"
        self.llm = conversational_llm
        
        # Base system prompt
        self.system_prompt = """You are Shruti, an AI loan assistant for NBFC Finance.

PERSONALITY:
- Warm, smart, patient - like a helpful teammate
- Clear and conversational, not robotic
- Use simple language, short paragraphs
- Light emojis occasionally (🙂, ✅) but don't overdo it
- Show empathy and never judge

YOUR ROLE:
- Help users explore loan options
- Gather information (amount, purpose, tenure)
- Explain options clearly
- Move the conversation forward naturally

IMPORTANT RULES:
1. Always acknowledge what the user said
2. Never repeat the same response
3. If user provides an amount, acknowledge it and move forward
4. Add disclaimers for estimates: "This is an estimate - final terms depend on verification"
5. Be honest about uncertainty
6. Keep responses SHORT (2-3 sentences max unless explaining something complex)

CURRENT CONTEXT:
{context}

USER SAID: {user_message}

YOUR TASK: {task}

Generate a natural, helpful response that moves the conversation forward."""
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """Main entry point - process user message and return updates"""
        user_message = state.get("user_message", "").strip()
        current_stage = state.get("current_stage", "greeting")
        
        # Get customer name (handle edge cases)
        raw_name = state.get("customer_name", "")
        customer_name = self._get_display_name(raw_name)
        
        # Debug logging
        print(f"[MASTER LLM] Stage: {current_stage}, Message: {user_message[:50]}...")
        
        # Handle onboarding first (collecting name, phone, age)
        if state.get("needs_onboarding", False):
            return await self._handle_onboarding(state, user_message)
        
        # Extract any useful information from the message
        extracted = self._extract_all_info(user_message)
        print(f"[MASTER LLM] Extracted: {extracted}")
        
        # Determine what to do based on current stage and extracted info
        response, next_stage, next_agent, updates = await self._decide_action_with_llm(
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
        
        # Extract amount
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
        
        # Pattern: ₹X or Rs X
        rupee_match = re.search(r'[₹rs\.]+\s*(\d[\d,]*)', text_lower)
        if rupee_match:
            return float(rupee_match.group(1).replace(',', ''))
        
        # Pattern: Plain large number (5+ digits)
        plain_match = re.search(r'\b(\d{5,7})\b', text)
        if plain_match:
            return float(plain_match.group(1))
        
        return None
    
    def _extract_purpose(self, msg: str) -> Optional[str]:
        """Extract loan purpose from message"""
        purposes = {
            "home": ["home", "house", "flat", "apartment", "property", "renovation"],
            "car": ["car", "vehicle", "bike", "scooter", "two wheeler"],
            "wedding": ["wedding", "marriage", "shaadi"],
            "education": ["education", "study", "college", "university", "course"],
            "medical": ["medical", "hospital", "treatment", "surgery", "health"],
            "travel": ["travel", "vacation", "trip", "holiday"],
            "business": ["business", "startup", "shop"],
            "personal": ["personal", "emergency", "urgent"]
        }
        
        for purpose, keywords in purposes.items():
            if any(k in msg for k in keywords):
                return purpose
        return None
    
    def _extract_tenure(self, msg: str) -> Optional[int]:
        """Extract tenure in months"""
        year_match = re.search(r'(\d+)\s*(?:year|years|yr|yrs)', msg)
        if year_match:
            return int(year_match.group(1)) * 12
        
        month_match = re.search(r'(\d+)\s*(?:month|months|mon)', msg)
        if month_match:
            return int(month_match.group(1))
        
        return None
    
    def _detect_intent(self, msg: str, original: str) -> str:
        """Detect user intent"""
        
        # Check for amount first
        if self._extract_amount(original):
            return "amount_provided"
        
        # Strong agreement
        agreement_phrases = [
            "made up my mind", "decided", "i'm ready", "im ready",
            "let's do it", "go ahead", "proceed", "i want to", "i need to"
        ]
        if any(phrase in msg for phrase in agreement_phrases):
            return "agreement"
        
        # Loan need
        if any(w in msg for w in ["need", "want", "require", "looking for"]) and \
           any(w in msg for w in ["loan", "money", "funds"]):
            return "loan_need"
        
        # Simple yes/ok
        if msg in ["yes", "ok", "okay", "sure", "yep", "yeah", "fine", "alright"]:
            return "simple_yes"
        
        # Questions
        if "?" in msg or any(w in msg for w in ["what", "how", "why", "when"]):
            return "question"
        
        # Hesitation
        if any(phrase in msg for phrase in ["not sure", "think about", "too expensive", "too high"]):
            return "hesitation"
        
        # Greeting
        if msg in ["hi", "hello", "hey"] or msg.startswith(("hi ", "hello ", "hey ")):
            return "greeting"
        
        return "general"
    
    async def _decide_action_with_llm(
        self, 
        state: LoanApplicationState, 
        message: str, 
        extracted: Dict, 
        stage: str, 
        name: str
    ) -> Tuple[str, str, str, Dict]:
        """Decide action and generate LLM response"""
        
        intent = extracted.get("intent", "general")
        amount = extracted.get("amount")
        purpose = extracted.get("purpose")
        pre_approved = state.get("pre_approved_limit") or 0
        
        updates = {}
        
        # If amount is provided, capture it and move to sales
        if amount:
            updates["loan_amount"] = amount
            if purpose:
                updates["loan_purpose"] = purpose
            
            # Generate LLM response acknowledging the amount
            context = self._build_context(state, name, pre_approved, amount, purpose)
            task = f"User provided loan amount of ₹{amount:,.0f}. Acknowledge this and tell them you'll show the EMI calculation. Keep it brief (1-2 sentences)."
            
            response = await self._generate_llm_response(context, message, task)
            
            return response, "offer_presentation", "sales", updates
        
        # Route based on stage
        if stage == "greeting":
            return await self._handle_greeting_with_llm(name, intent, purpose, pre_approved, message, state, updates)
        
        elif stage == "discovery":
            return await self._handle_discovery_with_llm(name, intent, purpose, pre_approved, message, state, updates)
        
        elif stage == "persuasion":
            return await self._handle_persuasion_with_llm(name, intent, purpose, pre_approved, message, state, updates)
        
        # Default: ask for amount
        context = self._build_context(state, name, pre_approved)
        task = "Ask the user how much they need for their loan. Be friendly and brief."
        response = await self._generate_llm_response(context, message, task)
        
        return response, "discovery", "master", updates
    
    async def _handle_greeting_with_llm(self, name: str, intent: str, purpose: str, pre_approved: float, message: str, state: dict, updates: dict) -> Tuple[str, str, str, Dict]:
        """Handle greeting stage with LLM"""
        
        if intent in ["loan_need", "agreement", "simple_yes"]:
            context = self._build_context(state, name, pre_approved)
            task = "User wants a loan. Ask them how much they need. Be friendly and mention their pre-approved limit if available."
            response = await self._generate_llm_response(context, message, task)
            return response, "discovery", "master", updates
        
        if purpose:
            context = self._build_context(state, name, pre_approved, purpose=purpose)
            task = f"User mentioned they need a loan for {purpose}. Briefly explain how a personal loan can help with this, then ask how much they need."
            response = await self._generate_llm_response(context, message, task)
            return response, "persuasion", "master", updates
        
        # Default greeting
        context = self._build_context(state, name, pre_approved)
        task = "Greet the user warmly and ask how you can help them today. Keep it brief."
        response = await self._generate_llm_response(context, message, task)
        
        return response, "greeting", "master", updates
    
    async def _handle_discovery_with_llm(self, name: str, intent: str, purpose: str, pre_approved: float, message: str, state: dict, updates: dict) -> Tuple[str, str, str, Dict]:
        """Handle discovery stage with LLM"""
        
        if intent in ["loan_need", "agreement", "simple_yes"]:
            context = self._build_context(state, name, pre_approved)
            task = "User confirmed they want a loan. Ask them for the amount. Be brief and friendly."
            response = await self._generate_llm_response(context, message, task)
            return response, "discovery", "master", updates
        
        if purpose:
            context = self._build_context(state, name, pre_approved, purpose=purpose)
            task = f"User needs loan for {purpose}. Briefly acknowledge this and ask for the amount."
            response = await self._generate_llm_response(context, message, task)
            return response, "persuasion", "master", updates
        
        if intent == "question":
            context = self._build_context(state, name, pre_approved)
            task = "User has a question. Answer it briefly and helpfully, then guide them back to telling you how much they need."
            response = await self._generate_llm_response(context, message, task)
            return response, "discovery", "master", updates
        
        # Default
        context = self._build_context(state, name, pre_approved)
        task = "Ask user how much they need for their loan. Keep it simple."
        response = await self._generate_llm_response(context, message, task)
        return response, "discovery", "master", updates
    
    async def _handle_persuasion_with_llm(self, name: str, intent: str, purpose: str, pre_approved: float, message: str, state: dict, updates: dict) -> Tuple[str, str, str, Dict]:
        """Handle persuasion stage with LLM"""
        
        if intent in ["agreement", "simple_yes", "loan_need"]:
            context = self._build_context(state, name, pre_approved)
            task = "User agreed to proceed. Ask them for the loan amount. Be encouraging but brief."
            response = await self._generate_llm_response(context, message, task)
            return response, "offer_presentation", "sales", updates
        
        if intent == "hesitation":
            context = self._build_context(state, name, pre_approved)
            task = "User seems hesitant. Acknowledge their concern empathetically and offer to answer questions. Keep it supportive, not pushy."
            response = await self._generate_llm_response(context, message, task)
            return response, "persuasion", "master", updates
        
        # Default
        context = self._build_context(state, name, pre_approved)
        task = "Move the conversation forward by asking for the loan amount."
        response = await self._generate_llm_response(context, message, task)
        return response, "offer_presentation", "sales", updates
    
    def _build_context(self, state: dict, name: str, pre_approved: float, amount: float = None, purpose: str = None) -> str:
        """Build context string for LLM"""
        context_parts = [f"Customer name: {name}"]
        
        if pre_approved and pre_approved > 0:
            context_parts.append(f"Pre-approved limit: ₹{pre_approved:,.0f}")
        
        if amount:
            context_parts.append(f"Requested amount: ₹{amount:,.0f}")
        
        if purpose:
            context_parts.append(f"Loan purpose: {purpose}")
        
        return "\n".join(context_parts)
    
    async def _generate_llm_response(self, context: str, user_message: str, task: str) -> str:
        """Generate response using LLM"""
        
        prompt = self.system_prompt.format(
            context=context,
            user_message=user_message,
            task=task
        )
        
        messages = [
            SystemMessage(content=prompt)
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            print(f"[MASTER LLM] Error calling LLM: {e}")
            # Fallback to simple response
            return f"I understand. How much are you looking for?"
    
    async def _handle_onboarding(self, state: LoanApplicationState, message: str) -> Dict[str, Any]:
        """Handle onboarding flow - collect name, phone, age"""
        step = state.get("onboarding_step", "name")
        updates = {}
        
        greetings = ["hi", "hello", "hey", "hii", "hiii", "namaste"]
        msg_lower = message.lower().strip()
        
        if step == "name":
            if msg_lower in greetings:
                response = """Nice to meet you! What's your name?"""
                updates["onboarding_step"] = "name"
            else:
                name = message.strip().title()
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
master_agent_llm = MasterAgentLLM()
