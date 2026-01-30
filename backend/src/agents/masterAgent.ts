import llmProvider from '../utils/llmProvider';
import { Intent, AgentType, MasterAgentDecision, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Master Agent - The orchestrator of all worker agents
 * Responsibilities:
 * 1. Greet users (first message only)
 * 2. Detect intent from user message
 * 3. Analyze conversation context
 * 4. Route to appropriate worker agent
 * 5. Ensure safety (no hallucinated legal advice)
 */
class MasterAgent {
  private readonly SYSTEM_PROMPT = `You are the Master Agent of an AI-powered compliance and business setup chatbot for Indian MSMEs.

Your responsibilities:
1. Analyze user messages and classify their intent
2. Consider conversation history and business context
3. Decide which specialized worker agent should handle the request
4. NEVER provide legal advice or make compliance decisions yourself

Available Intents:
- GREETING: User is greeting or starting conversation
- DISCOVERY: User wants to explore business ideas or get started
- PROFILE_UPDATE: User wants to update their business information
- COMPLIANCE_QUERY: User has questions about specific compliances (GST, FSSAI, etc.)
- DOCUMENT_UPLOAD: User is uploading or asking about documents
- DOCUMENT_QUERY: User has questions about what documents they need
- PLATFORM_QUERY: User asks about onboarding to Swiggy, Zomato, Amazon, etc.
- COST_QUERY: User wants to know about costs and fees
- TIMELINE_QUERY: User wants to know timelines and planning
- STATUS_QUERY: User wants to check their current compliance status
- EXPANSION: User wants to expand to new locations or scale business
- GENERAL_CHAT: General conversation not related to specific task
- UNKNOWN: Cannot determine intent

Available Worker Agents:
- DISCOVERY: For exploring business ideas and initial information gathering
- PROFILE_BUILDER: For collecting and updating business profile data
- RULE_ENGINE_INTERFACE: For fetching applicable compliances from rule engine
- COMPLIANCE_EXPLAINER: For explaining why specific compliances apply
- TIMELINE_PLANNER: For creating week-by-week implementation plans
- PLATFORM_ONBOARDING: For platform-specific onboarding guidance
- COST_RISK: For cost calculations and risk analysis
- DOCUMENT: For document identification and mapping to compliances
- NOTIFICATION: For scheduling reminders and notifications

You must respond ONLY with valid JSON in this format:
{
  "intent": "INTENT_NAME",
  "selected_agent": "AGENT_NAME",
  "reasoning": "Brief explanation of why this agent was selected",
  "context_summary": "Summary of relevant context from history"
}

CRITICAL RULES:
- NEVER make legal or compliance decisions
- ALWAYS consider full conversation history
- If user's first message, classify as GREETING
- Be precise with intent classification
- Provide clear reasoning for agent selection`;

  /**
   * Process user message and determine routing
   */
  async processMessage(userMessage: string, context: ChatContext): Promise<MasterAgentDecision> {
    try {
      // Check if this is first message (greeting)
      const isFirstMessage = context.message_history.filter(m => m.role === 'user').length === 0;

      const prompt = this.buildPrompt(userMessage, context, isFirstMessage);
      
      logger.info('Master Agent processing message', { 
        userId: context.user_id,
        messagePreview: userMessage.substring(0, 50)
      });

      const decision = await llmProvider.generateJSON<MasterAgentDecision>(
        prompt,
        this.SYSTEM_PROMPT,
        { temperature: 0.3, max_tokens: 500 }
      );

      // Validate decision
      this.validateDecision(decision);

      logger.info('Master Agent decision made', {
        intent: decision.intent,
        agent: decision.selected_agent,
        userId: context.user_id
      });

      return decision;

    } catch (error: any) {
      logger.error('Master Agent error', { error: error.message });
      
      // Fallback decision
      return {
        intent: Intent.UNKNOWN,
        selected_agent: AgentType.DISCOVERY,
        reasoning: 'Error in classification, defaulting to Discovery Agent',
        context_summary: 'Error occurred'
      };
    }
  }

  /**
   * Build prompt with context
   */
  private buildPrompt(userMessage: string, context: ChatContext, isFirstMessage: boolean): string {
    let prompt = `User Message: "${userMessage}"\n\n`;

    if (isFirstMessage) {
      prompt += 'This is the user\'s first message in this conversation.\n\n';
    }

    // Add conversation history
    if (context.message_history.length > 0) {
      prompt += 'Recent Conversation History:\n';
      const recentMessages = context.message_history.slice(-5);
      recentMessages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content.substring(0, 100)}\n`;
      });
      prompt += '\n';
    }

    // Add business profile context
    if (context.business_profile) {
      prompt += 'Business Profile:\n';
      const profile = context.business_profile;
      if (profile.business_name) prompt += `- Name: ${profile.business_name}\n`;
      if (profile.business_type) prompt += `- Type: ${profile.business_type}\n`;
      if (profile.state) prompt += `- Location: ${profile.city}, ${profile.state}\n`;
      if (profile.sells_food) prompt += `- Sells Food: Yes\n`;
      if (profile.annual_turnover) prompt += `- Turnover: ₹${profile.annual_turnover}\n`;
      prompt += '\n';
    }

    // Add last agent context
    if (context.last_agent_used) {
      prompt += `Last Agent Used: ${context.last_agent_used}\n`;
      prompt += `Last Intent: ${context.last_intent}\n\n`;
    }

    prompt += 'Based on the above context, classify the intent and select the appropriate worker agent.';

    return prompt;
  }

  /**
   * Validate decision structure
   */
  private validateDecision(decision: any): void {
    if (!decision.intent || !decision.selected_agent) {
      throw new Error('Invalid decision format from Master Agent');
    }

    // Validate intent is a valid enum value
    if (!Object.values(Intent).includes(decision.intent)) {
      logger.warn(`Invalid intent: ${decision.intent}, defaulting to UNKNOWN`);
      decision.intent = Intent.UNKNOWN;
    }

    // Validate agent is a valid enum value
    if (!Object.values(AgentType).includes(decision.selected_agent)) {
      logger.warn(`Invalid agent: ${decision.selected_agent}, defaulting to DISCOVERY`);
      decision.selected_agent = AgentType.DISCOVERY;
    }
  }

  /**
   * Generate greeting message for first-time users
   */
  generateGreeting(userName?: string): string {
    const greeting = userName ? `Hello ${userName}!` : 'Hello!';
    
    return `${greeting} 👋

Welcome to your AI-powered business compliance assistant! I'm here to help you navigate the complexities of starting and running your business in India.

I can help you with:
✅ Understanding required licenses and compliances (GST, FSSAI, Trade License, etc.)
📋 Document requirements and preparation
🏪 Onboarding to platforms like Swiggy, Zomato, Amazon, Flipkart
💰 Cost estimates and timeline planning
📍 State and city-specific regulations

**Important Disclaimer:** I provide guidance based on public information and is not a substitute for professional legal advice. Always consult with a qualified professional for your specific situation.

To get started, tell me about your business idea or what you need help with!`;
  }

  /**
   * Check if message is a greeting
   */
  isGreeting(message: string): boolean {
    const greetingWords = ['hello', 'hi', 'hey', 'namaste', 'good morning', 'good afternoon', 'good evening'];
    const lowerMessage = message.toLowerCase().trim();
    
    return greetingWords.some(word => lowerMessage.startsWith(word)) && lowerMessage.length < 50;
  }
}

export default new MasterAgent();
