"""
FastAPI Main Application
WebSocket-based real-time chat with LangGraph agents
Document upload support for Aadhaar, PAN, Salary Slips
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Dict, Optional
import json
import uuid
import os
import shutil
from datetime import datetime

from app.config import get_settings
from app.database import get_db, engine, Base
from app import models, schemas
from app.mock_data import get_customer_by_email
from app.services.ocr_service import ocr_service
from app.services.credit_bureau import credit_bureau

settings = get_settings()

# Ensure upload directories exist
UPLOAD_DIR = "uploads"
DOCUMENT_DIR = os.path.join(UPLOAD_DIR, "documents")
os.makedirs(DOCUMENT_DIR, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="NBFC Loan Chatbot API",
    description="AI-powered loan application system with multi-agent workflow",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded documents and sanction letters
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "NBFC Loan Chatbot API",
        "version": "1.0.0"
    }


@app.post("/api/customers/", response_model=schemas.CustomerResponse)
async def create_or_get_customer(
    customer_data: schemas.CustomerCreate,
    db: Session = Depends(get_db)
):
    """
    Create or get customer from Google OAuth data
    """
    # Check if customer exists
    existing_customer = db.query(models.Customer).filter(
        models.Customer.google_id == customer_data.google_id
    ).first()
    
    if existing_customer:
        return existing_customer
    
    # Get mock data if available
    mock_customer = get_customer_by_email(customer_data.email)
    
    # Create new customer
    db_customer = models.Customer(
        google_id=customer_data.google_id,
        email=customer_data.email,
        name=customer_data.name,
        phone=customer_data.phone or (mock_customer["phone"] if mock_customer else None),
        age=customer_data.age or (mock_customer["age"] if mock_customer else None),
        city=customer_data.city or (mock_customer["city"] if mock_customer else None),
        address=mock_customer["address"] if mock_customer else None,
        profile_image=customer_data.profile_image,
        kyc_verified=mock_customer["kyc_verified"] if mock_customer else False,
        credit_score=mock_customer["credit_score"] if mock_customer else None,
        pre_approved_limit=mock_customer["pre_approved_limit"] if mock_customer else None,
        monthly_salary=mock_customer["monthly_salary"] if mock_customer else None,
        current_loans=mock_customer["current_loans"] if mock_customer else {}
    )
    
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    
    return db_customer


@app.get("/api/customers/{customer_id}/conversations", response_model=list[schemas.ConversationResponse])
async def get_customer_conversations(
    customer_id: str,
    db: Session = Depends(get_db)
):
    """Get all conversations for a customer"""
    conversations = db.query(models.Conversation).filter(
        models.Conversation.customer_id == customer_id
    ).order_by(models.Conversation.started_at.desc()).all()
    
    return conversations


# ============================================
# DOCUMENT UPLOAD ENDPOINTS
# ============================================

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file"""
    # Check extension
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    return True, "OK"


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    customer_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document (Aadhaar, PAN, Salary Slip, etc.)
    
    document_type: aadhaar, pan, salary_slip, bank_statement
    """
    # Validate file
    is_valid, message = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Validate document type
    valid_types = ["aadhaar", "pan", "salary_slip", "bank_statement"]
    if document_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid document type. Allowed: {', '.join(valid_types)}"
        )
    
    # Check customer exists: accept either internal ID, email, or "guest"
    customer = None
    
    if customer_id == "guest":
        # For guest uploads, find the most recent guest customer or create one
        customer = db.query(models.Customer).filter(
            models.Customer.email.like("guest_%@temp.local")
        ).order_by(models.Customer.id.desc()).first()
        
        if not customer:
            # Create a temporary guest customer for uploads
            customer = models.Customer(
                google_id=str(uuid.uuid4()),
                email=f"guest_{uuid.uuid4().hex[:8]}@temp.local",
                name="Guest",
                kyc_verified=False,
                pre_approved_limit=0
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
    else:
        # Try to find by ID first, then by email
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if not customer:
            customer = db.query(models.Customer).filter(models.Customer.email == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1].lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{customer_id}_{document_type}_{timestamp}.{ext}"
    file_path = os.path.join(DOCUMENT_DIR, filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Run basic OCR / parsing for supported document types and update customer data
    extracted_data = None
    try:
        if document_type == "aadhaar":
            ocr_result = await ocr_service.extract_aadhaar(file_path)
            if ocr_result.get("success"):
                extracted_data = ocr_result
                # Update customer profile with address / name where helpful
                if not customer.address and ocr_result.get("address"):
                    customer.address = ocr_result["address"]
                if not customer.name and ocr_result.get("name"):
                    customer.name = ocr_result["name"]
                # Mark KYC as verified for this simple demo
                customer.kyc_verified = True
                db.commit()
        elif document_type == "salary_slip":
            ocr_result = await ocr_service.extract_salary_slip(file_path)
            if ocr_result.get("success"):
                extracted_data = ocr_result
                # Update customer monthly salary
                if ocr_result.get("monthly_salary") is not None:
                    customer.monthly_salary = ocr_result["monthly_salary"]
                db.commit()
        elif document_type == "pan":
            # Use OCR service to extract PAN from image/PDF
            ocr_result = await ocr_service.extract_pan(file_path)
            if ocr_result.get("success"):
                extracted_data = ocr_result
                pan_number = ocr_result.get("pan_number")
                
                # Update customer name from PAN if we extracted it
                if ocr_result.get("name") and not customer.name:
                    customer.name = ocr_result["name"]

                # If we found a PAN, fetch a credit score immediately and store it
                if pan_number:
                    score_result = await credit_bureau.fetch_credit_score_from_pan(pan_number)
                    if score_result.get("success"):
                        score_data = score_result["data"]
                        customer.credit_score = score_data["credit_score"]
                        # Simple pre-approved limit heuristic based on score
                        base_limit = 200000
                        bonus = max(score_data["credit_score"] - 700, 0) * 2000
                        customer.pre_approved_limit = base_limit + bonus
                        extracted_data["credit_score"] = score_data["credit_score"]
                        extracted_data["rating"] = score_data["rating"]
                        db.commit()
    except Exception as e:
        # Don't fail the upload if OCR fails; just log via print for now
        print(f"[OCR] Error processing {document_type}: {e}")

    # Return success response
    return {
        "success": True,
        "message": f"{document_type.replace('_', ' ').title()} uploaded successfully! ✅",
        "document_type": document_type,
        "filename": filename,
        "file_path": file_path,
        "uploaded_at": datetime.now().isoformat(),
        "extracted_data": extracted_data,
    }


@app.get("/api/documents/{customer_id}")
async def get_customer_documents(
    customer_id: str,
    db: Session = Depends(get_db)
):
    """Get list of uploaded documents for a customer"""
    # Check customer exists
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # List documents for this customer
    documents = []
    if os.path.exists(DOCUMENT_DIR):
        for filename in os.listdir(DOCUMENT_DIR):
            if filename.startswith(customer_id):
                # Parse document type from filename
                parts = filename.split("_")
                if len(parts) >= 2:
                    doc_type = parts[1]
                    documents.append({
                        "filename": filename,
                        "document_type": doc_type,
                        "file_path": os.path.join(DOCUMENT_DIR, filename)
                    })
    
    return {
        "customer_id": customer_id,
        "documents": documents,
        "count": len(documents)
    }


@app.delete("/api/documents/{customer_id}/{filename}")
async def delete_document(
    customer_id: str,
    filename: str,
    db: Session = Depends(get_db)
):
    """Delete a specific document"""
    file_path = os.path.join(DOCUMENT_DIR, filename)
    
    # Verify file belongs to customer
    if not filename.startswith(customer_id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
    
    # Delete file
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"success": True, "message": "Document deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Document not found")


# ============================================
# WEBSOCKET CHAT ENDPOINT
# ============================================

@app.websocket("/ws/chat/{customer_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    customer_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time chat
    Handles conversation with LangGraph agents
    
    customer_id can be:
    - "guest" for unauthenticated users
    - An email address for logged-in users
    - A UUID for existing customers
    """
    await websocket.accept()
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    active_connections[session_id] = websocket
    
    # Determine if this is a guest or authenticated user
    is_guest = customer_id == "guest" or customer_id == ""
    is_mock_user = False
    needs_onboarding = False
    
    customer = None
    
    if not is_guest:
        # Get customer by ID first, then fall back to email if needed
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if not customer:
            # Try treating the path parameter as email
            customer = db.query(models.Customer).filter(models.Customer.email == customer_id).first()

        # If still not found, try mock data first, then auto-create a minimal customer
        if not customer:
            mock = get_customer_by_email(customer_id)
            if mock:
                is_mock_user = True
                customer = models.Customer(
                    google_id=mock.get("google_id", str(uuid.uuid4())),
                    email=mock["email"],
                    name=mock["name"],
                    phone=mock.get("phone"),
                    age=mock.get("age"),
                    city=mock.get("city"),
                    address=mock.get("address"),
                    profile_image=None,
                    kyc_verified=mock.get("kyc_verified", False),
                    credit_score=mock.get("credit_score"),
                    pre_approved_limit=mock.get("pre_approved_limit"),
                    monthly_salary=mock.get("monthly_salary"),
                    current_loans=mock.get("current_loans", {})
                )
            else:
                # Auto-create a minimal customer for dynamic users
                email = customer_id
                # Derive a simple display name from email prefix
                display_name = email.split("@")[0].replace(".", " ").title() if "@" in email else "Friend"
                needs_onboarding = True  # New user, needs to provide details
                customer = models.Customer(
                    google_id=str(uuid.uuid4()),
                    email=email,
                    name=display_name,
                    phone=None,
                    age=None,
                    city=None,
                    address=None,
                    profile_image=None,
                    kyc_verified=False,
                    credit_score=None,
                    pre_approved_limit=0,
                    monthly_salary=None,
                    current_loans={}
                )

            db.add(customer)
            db.commit()
            db.refresh(customer)
        else:
            # Existing customer in DB - check if they have complete profile
            if not customer.phone or not customer.age:
                needs_onboarding = True
    else:
        # Guest user - create a temporary guest customer
        needs_onboarding = True
        customer = models.Customer(
            google_id=str(uuid.uuid4()),
            email=f"guest_{session_id[:8]}@temp.local",
            name="Friend",
            phone=None,
            age=None,
            city=None,
            address=None,
            profile_image=None,
            kyc_verified=False,
            credit_score=None,
            pre_approved_limit=0,
            monthly_salary=None,
            current_loans={}
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    
    # Create new conversation (always use the actual DB customer.id)
    conversation = models.Conversation(
        customer_id=customer.id,
        session_id=session_id,
        status="active"
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    # Initialize agent state
    from app.agents.state import LoanApplicationState
    state: LoanApplicationState = {
        "messages": [],
        "user_message": "",
        "bot_response": "",
        "customer_id": customer_id,
        "customer_email": customer.email,
        "customer_name": customer.name,
        "customer_phone": customer.phone,
        "customer_age": customer.age,
        "customer_address": customer.address,
        "loan_amount": None,
        "tenure_months": None,
        "interest_rate": None,
        "emi_amount": None,
        "emi_presented": False,
        "kyc_verified": customer.kyc_verified,
        "credit_score": customer.credit_score,
        "credit_rating": None,
        "pre_approved_limit": customer.pre_approved_limit,
        "monthly_salary": customer.monthly_salary,
        "aadhaar_number": None,
        "pan_number": None,
        "current_stage": "onboarding" if needs_onboarding else "greeting",
        "application_status": "pending",
        "next_agent": "master",
        "should_end": False,
        "rejection_reason": None,
        "sanction_letter_url": None,
        "conversation_context": [],
        "user_intent": None,
        "loan_application_id": None,
        "conversation_id": conversation.id,
        "is_guest": is_guest,
        "is_mock_user": is_mock_user,
        "needs_onboarding": needs_onboarding,
        "onboarding_step": "name" if is_guest else ("phone" if needs_onboarding else None)
    }
    
    # Send welcome message based on user type
    first_name = customer.name.split()[0] if customer.name else "there"
    
    if is_mock_user:
        # Known demo user - proceed directly
        welcome_msg = f"""Hi {first_name}! Welcome back to NBFC Finance 🙂

I'm Shruti, your loan assistant. Based on your profile, you're likely eligible for up to ₹{customer.pre_approved_limit:,.0f}.

How can I help you today? Are you looking for a loan, or just exploring your options?"""
    elif needs_onboarding:
        # New user or guest - need to collect details conversationally
        if is_guest:
            welcome_msg = f"""Hi there! Welcome to NBFC Finance.

I'm Shruti, your loan assistant. I'm here to help you explore your loan options.

Before we get started, could you tell me your name?"""
        else:
            # Logged in but missing details
            welcome_msg = f"""Hi {first_name}! Welcome to NBFC Finance.

I'm Shruti, your loan assistant. I can see you've logged in - great!

To help you better, I just need a couple of quick details:
- What's your phone number?
- And your age?

This helps me give you more accurate options."""
    else:
        # Existing user with complete profile
        welcome_msg = f"""Hi {first_name}! Welcome to NBFC Finance.

I'm Shruti, your loan assistant. How can I help you today?

Are you looking for a loan, or would you like to check your eligibility first?"""
    
    # Save welcome message
    welcome_db_msg = models.Message(
        conversation_id=conversation.id,
        sender="master",
        message=welcome_msg,
        extra_data={"agent": "master", "stage": "greeting"}
    )
    db.add(welcome_db_msg)
    db.commit()
    
    await websocket.send_json({
        "type": "bot_message",
        "content": welcome_msg,
        "agent": "master",
        "metadata": {"stage": "greeting"}
    })
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            user_message = message_data.get("content", "")
            
            if not user_message.strip():
                continue
            
            # Save user message
            user_db_msg = models.Message(
                conversation_id=conversation.id,
                sender="user",
                message=user_message,
                extra_data={}
            )
            db.add(user_db_msg)
            db.commit()
            
            # Process with complete workflow
            from app.agents.workflow import loan_workflow
            state = await loan_workflow.process_message(state, user_message)
            
            bot_response = state["bot_response"]
            current_agent = state.get("next_agent", "master")
            current_stage = state.get("current_stage", "greeting")
            
            # Save bot message
            bot_db_msg = models.Message(
                conversation_id=conversation.id,
                sender=current_agent,
                message=bot_response,
                extra_data={
                    "agent": current_agent,
                    "stage": current_stage,
                    "intent": state.get("user_intent")
                }
            )
            db.add(bot_db_msg)
            db.commit()
            
            # Send response to client
            await websocket.send_json({
                "type": "bot_message",
                "content": bot_response,
                "agent": current_agent,
                "metadata": {
                    "stage": current_stage,
                    "intent": state.get("user_intent")
                }
            })
            
            # Check if conversation should end
            if state.get("should_end"):
                conversation.status = "completed"
                db.commit()
                break
    
    except WebSocketDisconnect:
        # Mark conversation as abandoned
        conversation.status = "abandoned"
        db.commit()
        if session_id in active_connections:
            del active_connections[session_id]
    
    except Exception as e:
        print(f"Error in WebSocket: {e}")
        await websocket.send_json({
            "type": "error",
            "content": "An error occurred. Please try again."
        })
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
