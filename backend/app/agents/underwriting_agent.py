"""
Underwriting Agent - Credit Assessment and Loan Approval
Uses Groq LLM for dynamic, personalized responses
"""
from typing import Dict, Any
from langchain.schema import HumanMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.services.credit_bureau import credit_bureau
from app.llm_factory import analytical_llm


UNDERWRITING_SYSTEM_PROMPT = """You are Shruti, a credit assessment specialist at NBFC Finance.

Your personality:
- Analytical yet warm and empathetic
- Transparent about decisions and reasoning
- Celebratory for approvals, supportive for rejections
- Use emojis sparingly (🎉, ✅, 📊)

Your task: Generate a personalized response for credit assessment based on the scenario.

Guidelines:
- For approvals: Be celebratory, show loan summary clearly
- For rejections: Be empathetic, explain reason, offer alternatives
- For pending documents: Explain what's needed and why
- Always mention credit score and what it means
- Keep responses concise but informative

IMPORTANT: Generate ONLY the response message. No meta-commentary."""


class UnderwritingAgent:
    """
    Underwriting Agent - Credit evaluation and loan approval
    Analytical, fair, and transparent
    """
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """
        Evaluate credit score and determine loan eligibility
        """
        user_message = state.get("user_message", "")
        customer_email = state.get("customer_email")
        customer_name = state.get("customer_name", "").split()[0] if state.get("customer_name") else "there"
        loan_amount = state.get("loan_amount", 0)
        pre_approved_limit = state.get("pre_approved_limit", 0)
        monthly_salary = state.get("monthly_salary", 0)
        emi_amount = state.get("emi_amount", 0)
        pan_number = state.get("pan_number")
        awaiting_pan = state.get("awaiting_pan", False)

        # If we previously asked for PAN, try to extract it from the latest user message
        if awaiting_pan and not pan_number and user_message:
            import re

            msg = user_message.upper()
            match = re.search(r"[A-Z]{5}[0-9]{4}[A-Z]", msg)
            if match:
                pan_number = match.group(0)
            else:
                # Still waiting for a valid PAN
                response = f"""Thanks, {customer_name}. I couldn't detect a valid **PAN** in your message.

Please type your PAN in this format: **ABCDE1234F** (5 letters, 4 digits, 1 letter),
or upload a clear photo/PDF of your PAN card using the **+ Upload PAN** option below.

I'll use it only to fetch your credit score securely.
"""
                return {
                    "bot_response": response,
                    "current_stage": "underwriting",
                    "next_agent": "underwriting",
                    "awaiting_pan": True,
                }

        # If we still don't have a PAN and no credit score yet, ask for PAN explicitly
        if not pan_number and not state.get("credit_score"):
            response = f"""To check your **real-time credit score** and complete your approval, I need your **PAN number**, {customer_name}.

You can either:
1️⃣ **Type your PAN** here (e.g. `ABCDE1234F`), or
2️⃣ **Upload your PAN card** using the **+ Upload PAN** option.

I'll keep your PAN completely secure and use it only for this credit check.
"""
            return {
                "bot_response": response,
                "current_stage": "underwriting",
                "next_agent": "underwriting",
                "awaiting_pan": True,
            }
        
        # Fetch credit score - prefer PAN-based lookup when available
        if pan_number:
            credit_result = await credit_bureau.fetch_credit_score_from_pan(pan_number)
        else:
            credit_result = await credit_bureau.fetch_credit_score(customer_email)
        
        updates = {}
        
        if credit_result["success"]:
            credit_data = credit_result["data"]
            credit_score = credit_data["credit_score"]
            rating = credit_data["rating"]
            
            updates["credit_score"] = credit_score
            updates["credit_rating"] = rating
            if pan_number:
                updates["pan_number"] = pan_number
            updates["awaiting_pan"] = False
            
            # Decision logic
            decision = self._make_decision(
                credit_score=credit_score,
                loan_amount=loan_amount,
                pre_approved_limit=pre_approved_limit,
                monthly_salary=monthly_salary,
                emi_amount=emi_amount
            )
            
            updates["application_status"] = decision["status"]
            
            # Build scenario for LLM
            emi_percentage = self._calculate_emi_percentage(emi_amount, monthly_salary)
            
            if decision["status"] == "approved":
                scenario = f"""SCENARIO: Loan Approved

Customer: {customer_name}
Credit Score: {credit_score}/900 ({rating})
Credit Factors:
- Payment History: {credit_data['factors']['payment_history']}
- Credit Utilization: {credit_data['factors']['credit_utilization']}
- Credit Age: {credit_data['factors']['credit_age']}
- Recent Inquiries: {credit_data['factors']['recent_inquiries']}

Loan Details:
- Amount: ₹{loan_amount:,.0f}
- Interest Rate: {state.get('interest_rate')}% p.a.
- Monthly EMI: ₹{emi_amount:,.0f}
- Tenure: {state.get('tenure_months')} months
- EMI as % of income: {emi_percentage:.1f}%

Generate a celebratory approval message. Mention you're generating the sanction letter next."""
                
                updates["next_agent"] = "sanction"
            
            elif decision["status"] == "needs_documents":
                scenario = f"""SCENARIO: Need Salary Verification

Customer: {customer_name}
Credit Score: {credit_score}/900 ({rating}) - Good!
Requested Amount: ₹{loan_amount:,.0f}
Pre-approved Limit: ₹{pre_approved_limit:,.0f}
EMI: ₹{emi_amount:,.0f}

The amount is above pre-approved limit. Need salary slip to verify income.
EMI should be less than 50% of monthly income.

Generate a response explaining this positively. Ask for salary slip upload."""
                
                updates["next_agent"] = "document"
            
            elif decision["status"] == "rejected":
                reason = decision["reason"]
                alternative_amount = decision.get("alternative_amount", 0)
                
                scenario = f"""SCENARIO: Loan Not Approved (Offer Alternative)

Customer: {customer_name}
Credit Score: {credit_score}/900 ({rating})
Rejection Reason: {reason}
Alternative Amount Available: ₹{alternative_amount:,.0f}

Generate an empathetic response. Be transparent about the reason.
Offer alternatives:
1. Lower amount of ₹{alternative_amount:,.0f}
2. Tips to improve credit score
3. Reapply after 3-6 months"""
                
                updates["rejection_reason"] = reason
                updates["next_agent"] = "sales"
            
            # Generate response using LLM
            try:
                messages = [
                    SystemMessage(content=UNDERWRITING_SYSTEM_PROMPT),
                    HumanMessage(content=scenario)
                ]
                llm_response = await analytical_llm.ainvoke(messages)
                response = llm_response.content.strip()
            except Exception as e:
                print(f"[UNDERWRITING] LLM error: {e}")
                if decision["status"] == "approved":
                    response = f"Great news {customer_name}! Your loan of ₹{loan_amount:,.0f} is approved! 🎉 Generating your sanction letter..."
                else:
                    response = f"Thank you for your patience, {customer_name}. Let me review your application..."
            
        else:
            # Error fetching credit score - use LLM
            scenario = f"""SCENARIO: Credit Bureau Connection Error

Customer: {customer_name}
Issue: Unable to fetch credit score from bureau

Generate a friendly response explaining the temporary issue.
Ask if they know their approximate credit score or CIBIL score.
Reassure them you'll retry."""
            
            try:
                messages = [
                    SystemMessage(content=UNDERWRITING_SYSTEM_PROMPT),
                    HumanMessage(content=scenario)
                ]
                llm_response = await analytical_llm.ainvoke(messages)
                response = llm_response.content.strip()
            except Exception as e:
                print(f"[UNDERWRITING] LLM error: {e}")
                response = f"I'm having trouble connecting to the credit bureau, {customer_name}. Let me try again..."
            
            updates["next_agent"] = "underwriting"
        
        updates["bot_response"] = response
        updates["current_stage"] = "underwriting"
        
        return updates
    
    def _make_decision(
        self,
        credit_score: int,
        loan_amount: float,
        pre_approved_limit: float,
        monthly_salary: float,
        emi_amount: float
    ) -> Dict[str, Any]:
        """
        Make loan approval decision based on rules
        """
        # Rule 1: Credit score must be >= 700
        if credit_score < 700:
            return {
                "status": "rejected",
                "reason": f"Unfortunately, your credit score of {credit_score} is below our minimum requirement of 700. This is primarily to ensure you can comfortably manage the loan repayments.",
                "alternative_amount": pre_approved_limit * 0.5 if pre_approved_limit > 0 else 100000
            }
        
        # Rule 2: If amount <= pre-approved limit, instant approval
        if loan_amount <= pre_approved_limit:
            return {"status": "approved"}
        
        # Rule 3: If amount <= 2x pre-approved, need salary verification
        if loan_amount <= pre_approved_limit * 2:
            # Check if we have salary info
            if monthly_salary and monthly_salary > 0:
                # EMI should be <= 50% of salary
                if emi_amount <= monthly_salary * 0.5:
                    return {"status": "approved"}
                else:
                    return {
                        "status": "rejected",
                        "reason": f"The monthly EMI of ₹{emi_amount:,.0f} exceeds 50% of your monthly income. This could strain your finances, and we want to ensure you're comfortable with the repayment.",
                        "alternative_amount": pre_approved_limit
                    }
            else:
                return {"status": "needs_documents"}
        
        # Rule 4: If amount > 2x pre-approved, reject
        return {
            "status": "rejected",
            "reason": f"The requested amount of ₹{loan_amount:,.0f} is significantly higher than your current pre-approved limit of ₹{pre_approved_limit:,.0f}. This is based on your current credit profile and income assessment.",
            "alternative_amount": pre_approved_limit
        }
    
    def _get_score_emoji(self, score: int) -> str:
        """Get emoji based on credit score"""
        if score >= 800:
            return "🌟"
        elif score >= 750:
            return "⭐"
        elif score >= 700:
            return "✨"
        else:
            return "📊"
    
    def _calculate_emi_percentage(self, emi: float, salary: float) -> float:
        """Calculate EMI as percentage of salary"""
        if salary <= 0:
            return 0
        return (emi / salary) * 100


# Singleton instance
underwriting_agent = UnderwritingAgent()
