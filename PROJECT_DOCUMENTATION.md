# NBFC Loan Chatbot - Complete Project Documentation

**Built for EY Techathon 6.0**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Setup & Installation](#setup--installation)
5. [Agent System](#agent-system)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Testing & Demo](#testing--demo)

---

## 🎯 Project Overview

An AI-powered conversational loan application system that simulates a human sales executive using a multi-agent architecture. The system handles the complete loan journey from initial inquiry to sanction letter generation.

### Key Features

✅ **Google OAuth Authentication** - Separate chat sessions per user  
✅ **Multi-Agent System** - Master agent orchestrating 4 worker agents  
✅ **Human-like Conversation** - Natural, empathetic dialogue (TOP PRIORITY)  
✅ **Real-time Chat** - WebSocket-based communication  
✅ **Chat History Storage** - PostgreSQL database with per-user isolation  
✅ **Mock Services** - CRM, Credit Bureau, PDF generation  
✅ **Edge Case Handling** - Rejections, document uploads, alternatives  

### Business Value

- **Increased Conversion** - Human-like conversation improves customer experience
- **24/7 Availability** - AI agents work round the clock
- **Scalability** - Handle thousands of concurrent conversations
- **Cost Reduction** - Automate repetitive loan processing tasks
- **Data Insights** - Track conversation patterns and approval rates

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Landing Page │  │ Chat Widget  │  │ Google OAuth │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                            │                                 │
│                    WebSocket Connection                      │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           LangGraph Multi-Agent System                │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         Master Agent (Orchestrator)         │    │   │
│  │  │  - Analyzes user intent                     │    │   │
│  │  │  - Routes to appropriate worker agent       │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │       │                                              │   │
│  │       ├─► Sales Agent (Loan discussion)             │   │
│  │       ├─► Verification Agent (KYC)                  │   │
│  │       ├─► Underwriting Agent (Credit check)         │   │
│  │       └─► Sanction Agent (Approval & PDF)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Mock Services (CRM, Credit, PDF)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    Database (PostgreSQL) + Cache (Redis)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Conversation Flow

```
User Message
     │
     ▼
┌─────────────────┐
│  Master Agent   │ ◄─── Analyzes intent, determines next agent
└─────────────────┘
     │
     ├─► Sales Agent ────────► Discusses loan amount, EMI
     │
     ├─► Verification Agent ──► Verifies KYC from CRM
     │
     ├─► Underwriting Agent ──► Fetches credit score, approves/rejects
     │
     └─► Sanction Agent ───────► Generates PDF sanction letter
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **NextAuth.js** - Google OAuth authentication
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Modern icons
- **WebSocket** - Real-time communication

### Backend
- **FastAPI** - Modern Python web framework
- **LangGraph + LangChain** - Multi-agent orchestration
- **OpenAI GPT-3.5** - LLM for all agents
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM
- **Redis** - Caching (optional)
- **ReportLab** - PDF generation
- **Pydantic** - Data validation

### Infrastructure
- **PostgreSQL 14+** - Main database
- **Redis** - Session caching
- **Uvicorn** - ASGI server
- **WebSockets** - Real-time chat

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- OpenAI API key

### Frontend Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local file
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Run development server
npm run dev
```

**Get Google OAuth Credentials:**
1. Go to https://console.cloud.google.com/
2. Create project → Enable Google+ API
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### Backend Setup

```bash
# 1. Create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup PostgreSQL
psql -U postgres
CREATE DATABASE nbfc_loan_db;
\q

# 4. Create .env file
DATABASE_URL=postgresql://postgres:password@localhost:5432/nbfc_loan_db
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
USE_LOCAL_LLM=false
FRONTEND_URL=http://localhost:3000
SECRET_KEY=generate-with-openssl-rand-hex-32

# 5. Initialize database
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

# 6. Create upload directories
mkdir uploads\sanction_letters
mkdir uploads\documents

# 7. Run backend server
uvicorn app.main:app --reload
```

**Get OpenAI API Key:**
1. Visit https://platform.openai.com/
2. Create account → API Keys → Create new key
3. Copy key (starts with `sk-`)
4. $5 free trial credits available

### Access URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🤖 Agent System

### Agent Architecture

All agents use **OpenAI GPT-3.5 Turbo** with different temperature settings:

| Agent | Temperature | Purpose |
|-------|-------------|---------|
| **Master** | 0.7 | Natural greetings, intent analysis |
| **Sales** | 0.7 | Persuasive loan discussions |
| **Verification** | 0.3 | Precise KYC verification |
| **Underwriting** | 0.3 | Consistent credit decisions |
| **Sanction** | 0.3 | Accurate document generation |

### 1. Master Agent (Orchestrator)

**Role:** Main conversation manager

**Responsibilities:**
- Greet users warmly
- Analyze user intent from messages
- Route to appropriate worker agent
- Maintain conversation context

**Personality:** Friendly, warm, professional

**Example:**
```
User: "Hi, I need a loan"
Master: "Hey there! 👋 Welcome to NBFC Finance! I'm here to help you get 
the perfect personal loan. How much are you looking to borrow?"
```

### 2. Sales Agent

**Role:** Loan discussion and negotiation

**Responsibilities:**
- Extract loan amount and tenure from conversation
- Calculate EMI and interest rates
- Present loan offers persuasively
- Handle objections

**Personality:** Enthusiastic, persuasive (not pushy)

**Key Functions:**
- `_extract_amount()` - Parse loan amount from text
- `_calculate_emi()` - EMI computation
- `_calculate_interest_rate()` - Dynamic rate based on profile

**Example:**
```
User: "I need 5 lakhs"
Sales: "Perfect! 🎉 You're asking for ₹5,00,000. Based on your profile:
💰 Loan Amount: ₹5,00,000
⏱️ Tenure: 36 months
📊 Interest Rate: 10.5% p.a.
💳 Monthly EMI: ₹16,134
Shall I proceed with verification?"
```

### 3. Verification Agent

**Role:** KYC and identity verification

**Responsibilities:**
- Call CRM service for customer data
- Verify phone, address, KYC status
- Request missing documents

**Personality:** Professional, security-focused

**External Calls:**
- `crm_service.verify_customer_kyc()`

**Example:**
```
Verification: "Let me quickly verify your details... ⏳
✅ Verification Complete!
📱 Phone: +91-98765-43210
📍 Address: 123 MG Road, Mumbai
✅ KYC Status: Verified
Everything looks great!"
```

### 4. Underwriting Agent

**Role:** Credit assessment and approval

**Responsibilities:**
- Fetch credit score from bureau
- Evaluate creditworthiness
- Apply loan approval rules
- Make final decision

**Personality:** Analytical, fair, transparent

**Decision Rules:**
1. Credit score >= 700 required
2. Amount <= pre-approved → instant approval
3. Amount <= 2x pre-approved → need salary slip
4. EMI <= 50% of salary

**External Calls:**
- `credit_bureau.fetch_credit_score()`

**Example:**
```
Underwriting: "🎊 Excellent News! 🎊
📊 Credit Score: 782/900 - Excellent!
✅ Payment History: Excellent
✅ Credit Utilization: 28%
🎉 Your loan is APPROVED!"
```

### 5. Sanction Agent

**Role:** Final approval and documentation

**Responsibilities:**
- Generate PDF sanction letter
- Provide loan summary
- Explain next steps

**Personality:** Celebratory, clear, professional

**External Calls:**
- `pdf_generator.generate_sanction_letter()`

**Example:**
```
Sanction: "🎊 CONGRATULATIONS! 🎊
Your loan has been OFFICIALLY APPROVED!
📄 Sanction Letter Generated Successfully!
[Download Link]
What Happens Next:
1️⃣ Review & Sign (Today)
2️⃣ Disbursement (Within 2 days)
3️⃣ EMI Starts (Next month)"
```

---

## 💾 Database Schema

### Tables

#### 1. customers
```sql
CREATE TABLE customers (
    id VARCHAR PRIMARY KEY,
    google_id VARCHAR UNIQUE,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    city VARCHAR,
    kyc_verified BOOLEAN DEFAULT FALSE,
    credit_score INTEGER,
    pre_approved_limit FLOAT,
    monthly_salary FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. conversations
```sql
CREATE TABLE conversations (
    id VARCHAR PRIMARY KEY,
    customer_id VARCHAR REFERENCES customers(id),
    session_id VARCHAR UNIQUE,
    status VARCHAR DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);
```

#### 3. messages
```sql
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY,
    conversation_id VARCHAR REFERENCES conversations(id),
    sender VARCHAR NOT NULL,  -- 'user' or agent name
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 4. loan_applications
```sql
CREATE TABLE loan_applications (
    id VARCHAR PRIMARY KEY,
    customer_id VARCHAR REFERENCES customers(id),
    amount FLOAT NOT NULL,
    tenure_months INTEGER,
    interest_rate FLOAT,
    emi_amount FLOAT,
    status VARCHAR,  -- 'pending', 'approved', 'rejected'
    sanction_letter_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Relationships

```
customers (1) ──→ (N) conversations
customers (1) ──→ (N) loan_applications
conversations (1) ──→ (N) messages
```

---

## 📡 API Documentation

### REST Endpoints

#### Health Check
```
GET /
Response: {"status": "healthy"}
```

#### Create/Get Customer
```
POST /api/customers/
Request: {
  "google_id": "string",
  "email": "string",
  "name": "string"
}
Response: {
  "id": "string",
  "email": "string",
  "name": "string",
  "pre_approved_limit": 500000
}
```

#### Get Conversations
```
GET /api/customers/{customer_id}/conversations
Response: [
  {
    "id": "string",
    "started_at": "2024-01-01T00:00:00",
    "status": "active"
  }
]
```

### WebSocket Endpoint

```
WS /ws/chat/{customer_id}
```

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat/customer_123');
```

**Send Message:**
```json
{
  "content": "I need a loan of 5 lakhs"
}
```

**Receive Message:**
```json
{
  "type": "bot_message",
  "content": "Perfect! Let me help you with that...",
  "agent": "sales",
  "metadata": {
    "stage": "sales",
    "intent": "loan_inquiry"
  }
}
```

---

## 🧪 Testing & Demo

### Test Scenarios

#### Scenario 1: Instant Approval ✅
```
User: "Hi, I need a personal loan"
Bot: [Greeting]
User: "I need 3 lakhs"
Bot: [Shows offer with EMI]
User: "Yes, proceed"
Bot: [Verifies KYC → Checks credit (782) → Approves → Generates PDF]
```

#### Scenario 2: Document Required 📄
```
User: "I need 7 lakhs"
Bot: [Amount above pre-approved limit]
Bot: [Requests salary slip for verification]
```

#### Scenario 3: Rejection with Alternative ❌
```
User: "I need 15 lakhs"
Bot: [Credit score 680 - below threshold]
Bot: [Rejects, offers ₹4L alternative]
```

### Mock Customer Data

10 pre-loaded customers in `backend/app/mock_data.py`:

| Name | Email | Credit Score | Pre-approved |
|------|-------|--------------|--------------|
| Rahul Sharma | rahul.sharma@email.com | 782 | ₹5,00,000 |
| Priya Patel | priya.patel@email.com | 820 | ₹7,50,000 |
| Amit Kumar | amit.kumar@email.com | 695 | ₹3,00,000 |

### Cost Estimation

**OpenAI GPT-3.5 Turbo:**
- For 100 conversations: ~$0.04
- Free trial: $5 credits = 10,000+ messages
- Perfect for hackathon demo!

---

## 🎯 Key Design Decisions

### 1. Why LangGraph over CrewAI?
- Better control flow for deterministic loan process
- State management for tracking application progress
- Conditional routing for complex decision trees

### 2. Why PostgreSQL?
- ACID compliance for financial data
- Relationships between customers, conversations, applications
- JSON support for flexible metadata

### 3. Why WebSocket?
- Real-time bidirectional communication
- Low latency for chat experience
- Persistent connection for conversation continuity

### 4. Why OpenAI GPT-3.5?
- Cost-effective ($0.50 per 1M tokens)
- Fast response times
- Good quality for both conversation and analysis
- Different temperatures for different agent types

---

## 📊 Project Structure

```
nbfc-loan-chatbot/
├── frontend/
│   ├── app/                    # Next.js pages
│   │   ├── api/auth/          # NextAuth routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ChatWidget.tsx     # Main chat UI
│   │   └── AuthProvider.tsx   # Session provider
│   ├── lib/
│   │   └── websocket.ts       # WebSocket client
│   └── hooks/
│       └── useChat.ts         # Chat management hook
│
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # DB setup
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── llm_factory.py     # LLM configuration
│   │   ├── mock_data.py       # Test data
│   │   ├── agents/
│   │   │   ├── state.py       # LangGraph state
│   │   │   ├── master_agent.py
│   │   │   ├── sales_agent.py
│   │   │   ├── verification_agent.py
│   │   │   ├── underwriting_agent.py
│   │   │   ├── sanction_agent.py
│   │   │   └── workflow.py    # Agent orchestration
│   │   └── services/
│   │       ├── crm_service.py
│   │       ├── credit_bureau.py
│   │       └── pdf_generator.py
│   ├── uploads/               # Generated PDFs
│   └── requirements.txt
│
└── PROJECT_DOCUMENTATION.md   # This file
```

---

## 🔒 Security Features

1. **Google OAuth** - Secure authentication
2. **Session Management** - Per-user isolated sessions
3. **Database Isolation** - User data separation
4. **Input Validation** - Pydantic schemas
5. **CORS Protection** - Whitelisted origins
6. **Environment Variables** - Sensitive data in .env

---

## 📈 Scalability Considerations

### Current (Demo)
- Single server
- In-memory state
- Mock external services

### Production Ready
- **Load Balancer** - Multiple FastAPI instances
- **Redis** - Distributed state management
- **Message Queue** - Async processing (Celery)
- **CDN** - Static asset delivery
- **Database Replicas** - Read/write separation
- **Monitoring** - Prometheus + Grafana

---

## 🎓 Future Enhancements

1. ~~**Document Upload** - Real file handling (Aadhaar, salary slips)~~ ✅ IMPLEMENTED
2. **Voice Chat** - Speech-to-text integration
3. **Multi-language** - Hindi, Tamil, etc.
4. **Analytics Dashboard** - Conversion metrics
5. **A/B Testing** - Conversation variations
6. **Sentiment Analysis** - Customer satisfaction tracking
7. **Credit Score Tips** - Personalized advice

---

## 📄 Document Upload Feature

### Supported Documents
- **Aadhaar Card** - Front and back
- **PAN Card** - Clear photo
- **Salary Slip** - Latest month
- **Bank Statement** - Last 3 months (PDF)

### API Endpoints

**Upload Document:**
```bash
POST /api/documents/upload
Content-Type: multipart/form-data

file: <file>
document_type: aadhaar | pan | salary_slip | bank_statement
customer_id: <customer_id>
```

**Get Documents:**
```bash
GET /api/documents/{customer_id}
```

**Delete Document:**
```bash
DELETE /api/documents/{customer_id}/{filename}
```

### File Requirements
- **Formats:** JPG, JPEG, PNG, PDF
- **Max Size:** 5MB per file
- **Storage:** `uploads/documents/`

---

## 🏆 Competitive Advantages

1. **Superior Conversation Quality** - Human-like dialogue
2. **Complete Implementation** - All features working
3. **Production-Ready** - Scalable architecture
4. **Document Upload** - Real file handling
5. **Edge Cases** - Comprehensive handling
6. **Documentation** - Thorough and clear

---

**Built with ❤️ for EY Techathon 6.0**

*Demonstrating the future of AI-powered financial services*
