from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime


# Customer Schemas
class CustomerBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None


class CustomerCreate(CustomerBase):
    google_id: str
    profile_image: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: str
    google_id: str
    profile_image: Optional[str] = None
    kyc_verified: bool
    credit_score: Optional[int] = None
    pre_approved_limit: Optional[float] = None
    monthly_salary: Optional[float] = None
    current_loans: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Loan Application Schemas
class LoanApplicationCreate(BaseModel):
    amount: float
    tenure_months: int


class LoanApplicationResponse(BaseModel):
    id: str
    customer_id: str
    amount: float
    tenure_months: int
    interest_rate: Optional[float] = None
    emi_amount: Optional[float] = None
    status: str
    rejection_reason: Optional[str] = None
    salary_slip_url: Optional[str] = None
    sanction_letter_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    message: str


class MessageResponse(BaseModel):
    id: str
    sender: str
    message: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


# Conversation Schemas
class ConversationCreate(BaseModel):
    session_id: str


class ConversationResponse(BaseModel):
    id: str
    customer_id: str
    session_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    messages: List[MessageResponse] = []
    
    class Config:
        from_attributes = True


# WebSocket Message Schemas
class WSMessage(BaseModel):
    type: str  # "user_message", "bot_message", "agent_switch", "error"
    content: str
    agent: Optional[str] = None  # master, sales, verification, underwriting, sanction
    metadata: Optional[Dict[str, Any]] = None


# Agent State Schema
class AgentStateData(BaseModel):
    customer_name: Optional[str] = None
    loan_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    interest_rate: Optional[float] = None
    kyc_verified: bool = False
    credit_score: Optional[int] = None
    pre_approved_limit: Optional[float] = None
    salary: Optional[float] = None
    current_stage: str = "greeting"
    application_status: str = "pending"
    next_action: Optional[str] = None
    conversation_context: List[str] = []
