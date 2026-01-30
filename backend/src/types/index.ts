// Intent Classification Enum
export enum Intent {
  GREETING = 'GREETING',
  DISCOVERY = 'DISCOVERY',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  COMPLIANCE_QUERY = 'COMPLIANCE_QUERY',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_QUERY = 'DOCUMENT_QUERY',
  PLATFORM_QUERY = 'PLATFORM_QUERY',
  COST_QUERY = 'COST_QUERY',
  TIMELINE_QUERY = 'TIMELINE_QUERY',
  STATUS_QUERY = 'STATUS_QUERY',
  EXPANSION = 'EXPANSION',
  GENERAL_CHAT = 'GENERAL_CHAT',
  UNKNOWN = 'UNKNOWN'
}

// Agent Types
export enum AgentType {
  MASTER = 'MASTER',
  DISCOVERY = 'DISCOVERY',
  PROFILE_BUILDER = 'PROFILE_BUILDER',
  RULE_ENGINE_INTERFACE = 'RULE_ENGINE_INTERFACE',
  COMPLIANCE_EXPLAINER = 'COMPLIANCE_EXPLAINER',
  TIMELINE_PLANNER = 'TIMELINE_PLANNER',
  PLATFORM_ONBOARDING = 'PLATFORM_ONBOARDING',
  COST_RISK = 'COST_RISK',
  DOCUMENT = 'DOCUMENT',
  NOTIFICATION = 'NOTIFICATION'
}

// Database Models
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: Date;
  ended_at?: Date;
  is_active: boolean;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  agent_used?: AgentType;
  intent?: Intent;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name?: string;
  business_idea?: string;
  business_type?: string;
  state?: string;
  city?: string;
  annual_turnover?: number;
  employee_count?: number;
  sells_food?: boolean;
  online_delivery?: boolean;
  has_physical_store?: boolean;
  product_category?: string[];
  target_platforms?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  user_id: string;
  business_profile_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  extracted_metadata?: Record<string, any>;
  compliance_relevance?: string[];
  uploaded_at: Date;
}

export interface ComplianceResult {
  id: string;
  business_profile_id: string;
  compliance_id: string;
  compliance_name: string;
  level: 'central' | 'state' | 'local';
  is_mandatory: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
  documents_required: string[];
  estimated_cost?: number;
  estimated_timeline?: string;
  authority: string;
  created_at: Date;
  updated_at: Date;
}

// Rule Engine Types
export interface RuleCondition {
  field: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'includes' | 'exists';
  value: any;
}

export interface ComplianceRule {
  id: string;
  name: string;
  level: 'central' | 'state' | 'local';
  state?: string;
  city?: string;
  mandatory: boolean;
  conditions: RuleCondition[];
  documents_required: string[];
  estimated_cost: {
    min: number;
    max: number;
    currency: string;
  };
  estimated_timeline: string;
  penalty?: string;
  authority: string;
  authority_website?: string;
  description: string;
  steps?: string[];
  dependencies?: string[];
  source: string;
  last_verified: string;
}

// LLM Provider Types
export interface LLMResponse {
  content: string;
  provider: 'groq' | 'grok' | 'ollama';
  model: string;
  tokens_used?: number;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// Agent Response Types
export interface AgentResponse {
  message: string;
  agent_used: AgentType;
  intent: Intent;
  metadata?: Record<string, any>;
  requires_followup?: boolean;
  next_suggested_action?: string;
}

export interface MasterAgentDecision {
  intent: Intent;
  selected_agent: AgentType;
  reasoning: string;
  context_summary?: string;
}

// Chat Context Types
export interface ChatContext {
  user_id: string;
  session_id: string;
  business_profile?: BusinessProfile;
  message_history: Message[];
  last_agent_used?: AgentType;
  last_intent?: Intent;
}

// API Request/Response Types
export interface ChatRequest {
  user_id: string;
  session_id?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  session_id: string;
  message: string;
  agent_used: AgentType;
  intent: Intent;
  timestamp: Date;
  disclaimer?: string;
}

export interface DocumentUploadRequest {
  user_id: string;
  business_profile_id: string;
  file: any; // Express file upload
}

export interface ProfileUpdateRequest {
  user_id: string;
  updates: Partial<BusinessProfile>;
}
