"""
Document Agent - Handles document collection and verification
Uses Groq LLM for dynamic, personalized responses
"""
from typing import Dict, Any, List
from langchain.schema import HumanMessage, SystemMessage
from app.agents.state import LoanApplicationState
from app.llm_factory import conversational_llm
import os
from datetime import datetime


DOCUMENT_SYSTEM_PROMPT = """You are Shruti, a friendly document collection assistant at NBFC Finance.

Your personality:
- Patient, helpful, and encouraging
- Clear instructions without being overwhelming
- Use light emojis occasionally (📄, ✅, 📎)
- Never make customers feel bad about missing documents

Your task: Generate a personalized response for document collection based on the scenario.

Guidelines:
- Keep responses concise and actionable
- List documents clearly with bullet points
- Explain how to upload (click 📎 button)
- Give helpful tips (clear photos, readable text)
- If documents are missing, be encouraging not demanding
- If all documents received, celebrate and mention next step (credit check)

IMPORTANT: Generate ONLY the response message. No explanations."""


class DocumentAgent:
    """
    Document Agent - Guides customers through document upload
    Uses Groq LLM for dynamic responses
    """
    
    DOCUMENT_TYPES = {
        "aadhaar": {"name": "Aadhaar Card", "formats": ["jpg", "jpeg", "png", "pdf"], "max_size_mb": 5},
        "pan": {"name": "PAN Card", "formats": ["jpg", "jpeg", "png", "pdf"], "max_size_mb": 5},
        "salary_slip": {"name": "Latest Salary Slip", "formats": ["jpg", "jpeg", "png", "pdf"], "max_size_mb": 5},
        "bank_statement": {"name": "Bank Statement", "formats": ["pdf"], "max_size_mb": 10}
    }
    
    async def run(self, state: LoanApplicationState) -> Dict[str, Any]:
        """Handle document collection conversation"""
        user_message = state.get("user_message", "")
        customer_name = state.get("customer_name", "").split()[0] if state.get("customer_name") else "there"
        loan_amount = state.get("loan_amount", 0)
        pre_approved = state.get("pre_approved_limit", 0)
        
        # Get current document status
        uploaded_docs = state.get("uploaded_documents", {})
        required_docs = self._get_required_documents(loan_amount, pre_approved)
        pending_docs = [doc for doc in required_docs if doc not in uploaded_docs]
        
        # Build scenario for LLM
        intent = self._analyze_document_intent(user_message)
        
        uploaded_names = [self.DOCUMENT_TYPES[d]['name'] for d in uploaded_docs.keys()] if uploaded_docs else []
        pending_names = [self.DOCUMENT_TYPES[d]['name'] for d in pending_docs]
        
        scenario = f"""SCENARIO: Document Collection

Customer: {customer_name}
Loan Amount: ₹{loan_amount:,.0f}
User Message: "{user_message}"
Intent: {intent}

Documents Uploaded: {', '.join(uploaded_names) if uploaded_names else 'None yet'}
Documents Still Needed: {', '.join(pending_names) if pending_names else 'All received!'}

"""
        
        if intent == "upload_complete":
            scenario += "Customer says they've uploaded documents. Check if any are still missing and respond accordingly."
        elif intent == "question":
            scenario += f"Customer is asking a question about documents. Answer helpfully based on their message: '{user_message}'"
        elif intent == "help":
            scenario += "Customer needs help with uploading. Provide clear step-by-step guidance."
        elif not pending_docs:
            scenario += "All documents received! Celebrate and tell them you'll now check their credit score."
        else:
            scenario += "Request the pending documents in a friendly, non-pushy way. Explain how to upload using the 📎 button."
        
        # Generate response using LLM
        try:
            messages = [
                SystemMessage(content=DOCUMENT_SYSTEM_PROMPT),
                HumanMessage(content=scenario)
            ]
            llm_response = await conversational_llm.ainvoke(messages)
            response = llm_response.content.strip()
        except Exception as e:
            print(f"[DOCUMENT] LLM error: {e}")
            # Fallback
            if pending_docs:
                doc_list = ", ".join(pending_names)
                response = f"Hi {customer_name}! I need these documents: {doc_list}. Please upload using the 📎 button."
            else:
                response = f"All documents received, {customer_name}! Let me check your credit score now..."
        
        # Determine next step
        if not pending_docs:
            next_agent = "underwriting"
            next_stage = "underwriting"
        else:
            next_agent = "document"
            next_stage = "document_collection"
        
        return {
            "bot_response": response,
            "current_stage": next_stage,
            "next_agent": next_agent,
            "required_documents": required_docs,
            "pending_documents": pending_docs
        }
    
    def _get_required_documents(self, loan_amount: float, pre_approved: float) -> List[str]:
        """Determine which documents are required based on loan amount"""
        required = ["aadhaar", "pan"]
        if loan_amount > pre_approved:
            required.append("salary_slip")
        if loan_amount > pre_approved * 1.5:
            required.append("bank_statement")
        return required
    
    def _analyze_document_intent(self, message: str) -> str:
        """Analyze what the user wants regarding documents"""
        msg = message.lower()
        if any(w in msg for w in ["uploaded", "done", "sent", "attached", "submitted"]):
            return "upload_complete"
        if any(w in msg for w in ["what", "which", "how", "why", "where", "?"]):
            return "question"
        if any(w in msg for w in ["help", "confused", "don't understand", "problem"]):
            return "help"
        return "general"
    
    def validate_document(self, file_path: str, doc_type: str) -> Dict[str, Any]:
        """Validate an uploaded document"""
        doc_config = self.DOCUMENT_TYPES.get(doc_type)
        if not doc_config:
            return {"valid": False, "error": "Unknown document type"}
        if not os.path.exists(file_path):
            return {"valid": False, "error": "File not found"}
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > doc_config["max_size_mb"]:
            return {"valid": False, "error": f"File too large. Max: {doc_config['max_size_mb']}MB"}
        file_ext = file_path.split(".")[-1].lower()
        if file_ext not in doc_config["formats"]:
            return {"valid": False, "error": f"Invalid format. Accepted: {', '.join(doc_config['formats'])}"}
        return {"valid": True, "doc_type": doc_type, "file_path": file_path, "uploaded_at": datetime.now().isoformat()}


# Singleton instance
document_agent = DocumentAgent()
