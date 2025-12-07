"""
Verification Agent - KYC Verification
Verifies customer details from CRM
Uses Groq LLM for dynamic, personalized responses
"""
from typing import Dict, Any
from langchain.schema import HumanMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.services.crm_service import crm_service
from app.llm_factory import analytical_llm


VERIFICATION_SYSTEM_PROMPT = """You are Shruti, a friendly and professional KYC verification assistant at NBFC Finance.

Your personality:
- Warm, reassuring, and security-conscious
- Clear and concise communication
- Use light emojis occasionally (✅, 🔒, 📱)
- Never robotic or overly formal

Your task: Generate a personalized response based on the verification scenario provided.

Guidelines:
- Keep responses concise (3-5 short paragraphs max)
- Be transparent about what you're checking
- Reassure customers about data security
- Guide them clearly on next steps
- If KYC is complete, celebrate briefly and mention credit check is next
- If KYC is pending, explain what's needed simply
- If customer not found, welcome them warmly and ask for basic info

IMPORTANT: Generate ONLY the response message. No explanations or meta-commentary."""


class VerificationAgent:
    """
    Verification Agent - Handles KYC verification
    Uses Groq LLM for dynamic responses
    """
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """
        Verify customer KYC details from CRM
        """
        customer_email = state.get("customer_email")
        customer_name = state.get("customer_name", "").split()[0] if state.get("customer_name") else "there"
        loan_amount = state.get("loan_amount", 0)
        
        # Call CRM service to verify KYC
        kyc_result = await crm_service.verify_customer_kyc(customer_email)
        
        updates = {}
        
        if kyc_result["success"]:
            kyc_data = kyc_result["data"]
            
            # Update state with verified details
            updates["kyc_verified"] = kyc_data["kyc_verified"]
            updates["customer_phone"] = kyc_data["phone"]
            updates["customer_address"] = kyc_data["address"]
            
            if kyc_data["kyc_verified"]:
                # KYC is complete - use LLM for response
                scenario = f"""SCENARIO: KYC Verification Complete

Customer: {customer_name}
Loan Amount Requested: ₹{loan_amount:,.0f}
Verified Details:
- Phone: {kyc_data['phone']}
- Address: {kyc_data['address']}
- City: {kyc_data['city']}
- KYC Status: {kyc_data['kyc_status']}

Generate a celebratory response confirming their identity is verified. Mention you'll now check their credit score (soft inquiry, won't affect their score)."""
                
                updates["next_agent"] = "underwriting"
            else:
                # KYC is pending
                scenario = f"""SCENARIO: KYC Pending

Customer: {customer_name}
Partial Details Found:
- Phone: {kyc_data['phone']}
- Address: {kyc_data['address']}

Generate a response explaining their KYC is pending. They need to upload:
1. Aadhaar card (front & back)
2. Recent selfie for verification

Make it sound easy and quick (2 minutes). Reassure about security."""
                
                updates["next_agent"] = "document"
                updates["application_status"] = "needs_documents"
        else:
            # Customer not found in CRM
            scenario = f"""SCENARIO: New Customer

Customer: {customer_name}
Loan Amount Requested: ₹{loan_amount:,.0f}

Customer not found in our system. Generate a welcoming response for a new customer.
Ask them to share:
1. Phone number
2. Current address  
3. Date of birth

Reassure them about data security."""
            
            updates["next_agent"] = "document"
            updates["kyc_verified"] = False
            updates["application_status"] = "needs_documents"
        
        # Generate response using LLM
        try:
            messages = [
                SystemMessage(content=VERIFICATION_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await analytical_llm.ainvoke(messages)
            response = llm_response.content.strip()
        except Exception as e:
            print(f"[VERIFICATION] LLM error: {e}")
            # Fallback response
            response = f"Let me verify your details, {customer_name}. One moment please..."
        
        updates["bot_response"] = response
        updates["current_stage"] = "verification"
        
        return updates


# Singleton instance
verification_agent = VerificationAgent()
