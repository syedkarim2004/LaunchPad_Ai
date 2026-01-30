# Agentic AI Compliance & Business Setup Chatbot

A complete Node.js/TypeScript backend for an agentic AI chatbot that helps Indian MSMEs with business setup, compliance guidance, platform onboarding, and document understanding.

## 🏗️ Architecture Overview

```
User Message → Master Agent → Worker Agent Selection → Execute Agent → Rule Engine → Response
```

### Key Components

1. **Master Agent** - Orchestrates all interactions, detects intent, routes to worker agents
2. **Worker Agents** (9 specialized agents):
   - Discovery Agent - Business idea exploration
   - Profile Builder Agent - Structured data collection
   - Rule Engine Interface Agent - Compliance fetching
   - Compliance Explainer Agent - Simple explanations
   - Timeline Planner Agent - Week-by-week planning
   - Platform Onboarding Agent - Swiggy, Zomato, Amazon guidance
   - Cost & Risk Agent - Cost calculations
   - Document Agent - Document identification & mapping
   - Notification Agent - Reminders and deadlines

3. **Rule Engine** - Deterministic compliance checking (AI never decides law)
4. **LLM Provider** - Grok API with Ollama fallback

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **AI/LLM**: LangChain, Grok API, Ollama (fallback)
- **Database**: Supabase (PostgreSQL)
- **File Upload**: express-fileupload

## 📁 Project Structure

```
backend/
├── src/
│   ├── agents/              # All AI agents
│   │   ├── masterAgent.ts
│   │   ├── discoveryAgent.ts
│   │   ├── profileBuilderAgent.ts
│   │   ├── ruleEngineInterfaceAgent.ts
│   │   ├── complianceExplainerAgent.ts
│   │   ├── timelinePlannerAgent.ts
│   │   ├── platformOnboardingAgent.ts
│   │   ├── costRiskAgent.ts
│   │   ├── documentAgent.ts
│   │   └── notificationAgent.ts
│   ├── database/            # Supabase client and repositories
│   │   ├── supabase.ts
│   │   └── repositories.ts
│   ├── middleware/          # Express middleware
│   ├── orchestrator/        # Agent orchestration (LangGraph-style)
│   ├── routes/              # API routes
│   ├── rules/               # Rule engine JSON database
│   │   ├── central/         # Central govt compliances (GST, FSSAI, etc.)
│   │   ├── states/          # State-wise rules (KA, MH, etc.)
│   │   └── platforms/       # Platform requirements
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Utilities (LLM provider, logger, rule engine)
│   └── server.ts            # Entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
```env
# Supabase (PostgreSQL)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# LLM Providers
GROK_API_KEY=your_grok_api_key  # Primary
OLLAMA_BASE_URL=http://localhost:11434  # Fallback

# Server
PORT=5000
NODE_ENV=development
```

### 3. Set Up Database

Run the SQL schema in Supabase SQL Editor (found in `src/database/supabase.ts`):

```sql
-- Creates: users, sessions, messages, business_profiles, documents, compliance_results
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📡 API Endpoints

### Chat
- `POST /api/chat` - Send message to chatbot
- `GET /api/chat/history/:sessionId` - Get conversation history
- `POST /api/chat/session/new` - Create new session
- `POST /api/chat/session/end` - End session

### Business Profile
- `GET /api/profile` - Get business profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile
- `GET /api/profile/completeness` - Check profile completeness

### Compliance
- `GET /api/compliance/check` - Check applicable compliances
- `GET /api/compliance/:id` - Get compliance details
- `GET /api/compliance/timeline/generate` - Generate implementation timeline
- `GET /api/compliance/status/all` - Get compliance status

### Documents
- `POST /api/documents/upload` - Upload and analyze document
- `GET /api/documents` - List user's documents
- `GET /api/documents/requirements/check` - Check document requirements

### Platforms
- `GET /api/platforms` - List all platforms
- `GET /api/platforms/:name` - Get platform details
- `GET /api/platforms/:name/eligibility` - Check eligibility

### Health
- `GET /api/health` - Health check
- `GET /api/health/detailed` - Detailed health status

## 📝 Example Usage

### Send a Chat Message

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "message": "I want to start a cloud kitchen in Bangalore"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "message": "Great! A cloud kitchen is a fantastic business idea...",
    "agent_used": "DISCOVERY",
    "intent": "DISCOVERY",
    "timestamp": "2026-01-31T10:00:00.000Z"
  }
}
```

## 🔒 Intent Classification

The Master Agent classifies user intent into:

| Intent | Description | Routed To |
|--------|-------------|-----------|
| GREETING | User greeting | Master Agent |
| DISCOVERY | Business exploration | Discovery Agent |
| PROFILE_UPDATE | Update business info | Profile Builder |
| COMPLIANCE_QUERY | Compliance questions | Rule Engine / Explainer |
| DOCUMENT_UPLOAD | Document handling | Document Agent |
| DOCUMENT_QUERY | Document questions | Document Agent |
| PLATFORM_QUERY | Platform onboarding | Platform Agent |
| COST_QUERY | Cost inquiries | Cost & Risk Agent |
| TIMELINE_QUERY | Timeline planning | Timeline Planner |
| STATUS_QUERY | Status check | Notification Agent |

## 🏛️ Rule Engine

The Rule Engine provides deterministic compliance checking:

- **Central Rules**: GST, FSSAI, Udyam, Trademark
- **State Rules**: Karnataka, Maharashtra shop acts
- **Platform Rules**: Swiggy, Zomato, Amazon, Flipkart

Rules are stored as JSON and can be updated without code changes.

### Rule Schema Example
```json
{
  "id": "GST",
  "name": "Goods and Services Tax Registration",
  "level": "central",
  "mandatory": false,
  "conditions": [
    { "field": "annual_turnover", "operator": ">", "value": 4000000 }
  ],
  "documents_required": ["PAN Card", "Aadhaar Card", "Bank Account Statement"],
  "penalty": "₹50/day for late filing",
  "authority": "GSTN",
  "source": "https://gst.gov.in"
}
```

## ⚠️ Safety & Disclaimers

- All compliance-related responses include a legal disclaimer
- AI agents NEVER make legal decisions - only the Rule Engine does
- No auto-filing of documents
- All guidance is based on public information

## 🧪 Testing

```bash
# Run tests
npm test

# Lint
npm run lint
```

## 📊 Monitoring

- Logs are written to `logs/` directory
- Health endpoint provides service status
- Request logging for debugging

## 🚢 Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Run: `NODE_ENV=production npm start`

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

## 🤝 Integration with Frontend

The API is designed to work with the Next.js frontend in the parent directory:

1. Configure CORS origin in `.env`
2. Use `x-user-id` header for authentication
3. Session ID is returned and should be used for conversation continuity

## 📜 License

MIT

## 🆘 Support

For issues, please check:
1. Environment configuration
2. Supabase connection
3. LLM provider availability (Grok or Ollama)
