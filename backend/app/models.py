from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    google_id = Column(String, unique=True, index=True)  # Google OAuth ID
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String)
    age = Column(Integer)
    city = Column(String)
    address = Column(Text)
    profile_image = Column(String)  # Google profile image URL
    
    # KYC and Financial Info
    kyc_verified = Column(Boolean, default=False)
    credit_score = Column(Integer)
    pre_approved_limit = Column(Float)
    monthly_salary = Column(Float)
    current_loans = Column(JSON)  # Store as JSON: {"home_loan": 2500000, "auto_loan": 0}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    conversations = relationship("Conversation", back_populates="customer")
    loan_applications = relationship("LoanApplication", back_populates="customer")


class LoanApplication(Base):
    __tablename__ = "loan_applications"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    
    # Loan Details
    amount = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    interest_rate = Column(Float)
    emi_amount = Column(Float)
    
    # Status
    status = Column(String, default="pending")  # pending, approved, rejected, needs_documents
    rejection_reason = Column(Text)
    
    # Documents
    salary_slip_url = Column(String)
    sanction_letter_url = Column(String)
    
    # Additional data
    extra_data = Column(JSON)  # Additional data from the conversation
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="loan_applications")
    conversation = relationship("Conversation", back_populates="loan_application", uselist=False)


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    loan_application_id = Column(String, ForeignKey("loan_applications.id"))
    
    session_id = Column(String, unique=True, index=True)
    status = Column(String, default="active")  # active, completed, abandoned
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    
    # Relationships
    customer = relationship("Customer", back_populates="conversations")
    loan_application = relationship("LoanApplication", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    
    sender = Column(String, nullable=False)  # user, master, sales, verification, underwriting, sanction
    message = Column(Text, nullable=False)
    extra_data = Column(JSON)  # Additional context like agent state, etc.
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class AgentState(Base):
    __tablename__ = "agent_states"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), unique=True, nullable=False)
    
    state_data = Column(JSON, nullable=False)  # LangGraph state
    current_node = Column(String)  # Current agent/node in the graph
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
