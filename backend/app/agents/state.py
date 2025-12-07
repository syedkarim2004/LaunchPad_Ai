"""
LangGraph State Definition
Defines the state structure for the loan application workflow
"""
from typing import TypedDict, List, Optional, Literal, Dict, Any
from langchain_core.messages import BaseMessage


class LoanApplicationState(TypedDict):
    """State for the loan application conversation"""
    
    # Conversation
    messages: List[BaseMessage]
    user_message: str
    bot_response: str
    
    # Customer Info
    customer_id: Optional[str]
    customer_email: Optional[str]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    customer_address: Optional[str]
    
    # Loan Details
    loan_amount: Optional[float]
    tenure_months: Optional[int]
    interest_rate: Optional[float]
    emi_amount: Optional[float]
    emi_presented: bool  # Track if EMI offer was shown to user
    
    # Verification Status
    kyc_verified: bool
    credit_score: Optional[int]
    credit_rating: Optional[str]
    pre_approved_limit: Optional[float]
    monthly_salary: Optional[float]
    
    # Application Status
    current_stage: Literal[
        "greeting",
        "sales",
        "verification",
        "underwriting",
        "document_upload",
        "sanction",
        "completed",
        "rejected"
    ]
    application_status: Literal[
        "pending",
        "approved",
        "rejected",
        "needs_documents",
        "under_review"
    ]
    
    # Workflow Control
    next_agent: Optional[str]
    should_end: bool
    
    # Additional Context
    rejection_reason: Optional[str]
    sanction_letter_url: Optional[str]
    conversation_context: List[str]  # Track conversation flow
    user_intent: Optional[str]  # Current user intent
    
    # Metadata
    loan_application_id: Optional[str]
    conversation_id: Optional[str]
