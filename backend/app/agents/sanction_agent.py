"""
Sanction Agent - Loan Approval and Sanction Letter Generation
Uses Groq LLM for dynamic, personalized responses
"""
from typing import Dict, Any
from langchain.schema import HumanMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.services.pdf_generator import pdf_generator
from app.llm_factory import analytical_llm
from app.config import get_settings


SANCTION_SYSTEM_PROMPT = """You are Shruti, a loan sanction specialist at NBFC Finance.

Your personality:
- Celebratory and warm for approvals
- Professional yet friendly
- Clear about next steps
- Use emojis to celebrate (🎉, ✅, 📄)

Your task: Generate a personalized sanction/approval message based on the scenario.

Guidelines:
- Celebrate the approval enthusiastically
- Show loan summary clearly (amount, rate, EMI, tenure)
- Include the download link for sanction letter
- Explain next steps: 1) Review & Sign, 2) Disbursement, 3) EMI starts
- Mention important notes (validity, prepayment, late fees)
- Offer to help with any questions

IMPORTANT: Generate ONLY the response message. Include the download link exactly as provided."""


class SanctionAgent:
    """
    Sanction Agent - Final approval and documentation
    Uses Groq LLM for dynamic responses
    """
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """
        Generate sanction letter and provide next steps
        """
        customer_name = state.get("customer_name", "Customer")
        first_name = customer_name.split()[0] if customer_name else "Customer"
        customer_address = state.get("customer_address", "")
        loan_amount = state.get("loan_amount", 0)
        tenure_months = state.get("tenure_months", 36)
        interest_rate = state.get("interest_rate", 10.5)
        emi_amount = state.get("emi_amount", 0)
        loan_application_id = state.get("loan_application_id", "LOAN" + str(hash(customer_name))[:8])
        
        # Generate sanction letter PDF
        try:
            pdf_path = await pdf_generator.generate_sanction_letter(
                customer_name=customer_name,
                customer_address=customer_address or "As per records",
                loan_amount=loan_amount,
                tenure_months=tenure_months,
                interest_rate=interest_rate,
                emi_amount=emi_amount,
                loan_id=loan_application_id
            )

            # Convert filesystem path to public URL
            pdf_relative = pdf_path.replace("\\", "/")
            if pdf_relative.startswith("./"):
                pdf_relative = pdf_relative[2:]
            if not pdf_relative.startswith("uploads/"):
                pdf_relative = f"uploads/{pdf_relative.split('uploads/')[-1]}"
            settings = get_settings()
            backend_base = settings.FRONTEND_URL.replace("3000", "8000")
            pdf_url = f"{backend_base.rstrip('/')}/" + pdf_relative
            
            updates = {
                "sanction_letter_url": pdf_url,
                "application_status": "approved",
                "should_end": False,
                "current_stage": "sanction"
            }
            
            # Build scenario for LLM
            scenario = f"""SCENARIO: Loan Approved - Generate Sanction Letter Message

Customer: {first_name}
Loan Details:
- Approved Amount: ₹{loan_amount:,.0f}
- Interest Rate: {interest_rate}% per annum
- Tenure: {tenure_months} months ({tenure_months//12} years {tenure_months%12} months)
- Monthly EMI: ₹{emi_amount:,.0f}
- Processing Fee: ₹0 (Waived)
- First EMI Date: 5th of next month

Download Link: [Click here to download]({pdf_url})

Generate a celebratory message with:
1. Congratulations
2. Loan summary
3. Download link (use exactly as provided above)
4. Next steps (Review & Sign, Disbursement in 2 days, EMI starts next month)
5. Important notes (30 day validity, no prepayment penalty after 6 months)
6. Offer to help with questions"""
            
            # Generate response using LLM
            try:
                messages = [
                    SystemMessage(content=SANCTION_SYSTEM_PROMPT),
                    HumanMessage(content=scenario)
                ]
                llm_response = await analytical_llm.ainvoke(messages)
                response = llm_response.content.strip()
            except Exception as e:
                print(f"[SANCTION] LLM error: {e}")
                response = f"""🎉 Congratulations {first_name}! Your loan is approved!

**Loan Summary:**
- Amount: ₹{loan_amount:,.0f}
- Interest: {interest_rate}% p.a.
- EMI: ₹{emi_amount:,.0f}
- Tenure: {tenure_months} months

📄 [Click here to download your sanction letter]({pdf_url})

Disbursement within 2 working days. Any questions? I'm here to help!"""
            
            updates["bot_response"] = response
            updates["next_agent"] = "completed"
            
        except Exception as e:
            print(f"[SANCTION] PDF generation error: {e}")
            
            # Error generating PDF - use LLM
            scenario = f"""SCENARIO: Loan Approved but PDF Generation Failed

Customer: {first_name}
Loan Amount: ₹{loan_amount:,.0f}
Interest Rate: {interest_rate}% p.a.
EMI: ₹{emi_amount:,.0f}
Customer Email: {state.get('customer_email')}

Generate a message confirming approval but explaining there's a small technical issue with the PDF.
Offer to email the sanction letter instead. Reassure the approval is confirmed."""
            
            try:
                messages = [
                    SystemMessage(content=SANCTION_SYSTEM_PROMPT),
                    HumanMessage(content=scenario)
                ]
                llm_response = await analytical_llm.ainvoke(messages)
                response = llm_response.content.strip()
            except Exception as e2:
                print(f"[SANCTION] LLM error: {e2}")
                response = f"Great news {first_name}! Your loan of ₹{loan_amount:,.0f} is approved! 🎉 I'll email your sanction letter shortly."
            
            updates = {
                "bot_response": response,
                "current_stage": "sanction",
                "next_agent": "sanction",
                "application_status": "approved"
            }
        
        return updates


# Singleton instance
sanction_agent = SanctionAgent()
