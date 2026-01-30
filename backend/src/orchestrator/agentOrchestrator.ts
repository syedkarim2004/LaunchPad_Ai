import { AgentType, Intent, ChatContext, AgentResponse, Message } from '../types';
import {
  masterAgent,
  discoveryAgent,
  profileBuilderAgent,
  ruleEngineInterfaceAgent,
  complianceExplainerAgent,
  timelinePlannerAgent,
  platformOnboardingAgent,
  costRiskAgent,
  documentAgent,
  notificationAgent
} from '../agents';
import { sessionRepo, messageRepo, businessProfileRepo } from '../database/repositories';
import logger from '../utils/logger';

/**
 * Agent State for LangGraph-style state machine
 */
interface AgentState {
  userId: string;
  sessionId: string;
  userMessage: string;
  context: ChatContext;
  intent?: Intent;
  selectedAgent?: AgentType;
  response?: AgentResponse;
  isComplete: boolean;
  error?: string;
}

/**
 * Agent Orchestrator - LangGraph-style state machine for agent routing
 * 
 * Flow:
 * User Message → Master Agent → Worker Agent Selection → Execute Agent → Response
 */
class AgentOrchestrator {
  /**
   * Process a user message through the agent graph
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string,
    uploadedFile?: any
  ): Promise<AgentResponse> {
    try {
      // Initialize state
      let state: AgentState = {
        userId,
        sessionId,
        userMessage,
        context: await this.buildContext(userId, sessionId),
        isComplete: false
      };

      logger.info('Starting agent orchestration', {
        userId,
        sessionId,
        messagePreview: userMessage.substring(0, 50)
      });

      // Step 1: Save user message to database
      await this.saveUserMessage(state);

      // Step 2: Check for first message greeting
      const isFirstMessage = state.context.message_history.filter(m => m.role === 'user').length === 1;
      
      if (isFirstMessage && masterAgent.isGreeting(userMessage)) {
        const greeting = masterAgent.generateGreeting();
        state.response = {
          message: greeting,
          agent_used: AgentType.MASTER,
          intent: Intent.GREETING
        };
        state.isComplete = true;
      }

      // Step 3: Master Agent - Intent Detection & Routing
      if (!state.isComplete) {
        state = await this.runMasterAgent(state);
      }

      // Step 4: Execute selected worker agent
      if (!state.isComplete && state.selectedAgent) {
        state = await this.runWorkerAgent(state, uploadedFile);
      }

      // Step 5: Finalize and save response
      if (!state.response) {
        state.response = {
          message: 'I apologize, but I encountered an issue processing your request. Could you please try again?',
          agent_used: AgentType.MASTER,
          intent: Intent.UNKNOWN
        };
      }

      // Add disclaimer if compliance-related
      if (this.isComplianceRelated(state.intent)) {
        state.response.message = this.addDisclaimer(state.response.message);
      }

      // Save assistant message to database
      await this.saveAssistantMessage(state);

      logger.info('Agent orchestration complete', {
        userId,
        agent: state.selectedAgent,
        intent: state.intent
      });

      return state.response;

    } catch (error: any) {
      logger.error('Agent orchestration error', { error: error.message, userId, sessionId });
      
      return {
        message: 'I apologize, but something went wrong. Please try again or contact support if the issue persists.',
        agent_used: AgentType.MASTER,
        intent: Intent.UNKNOWN
      };
    }
  }

  /**
   * Build context for the current conversation
   */
  private async buildContext(userId: string, sessionId: string): Promise<ChatContext> {
    // Fetch message history
    const messages = await messageRepo.getMessagesBySession(sessionId);
    
    // Fetch business profile
    const businessProfile = await businessProfileRepo.getProfileByUserId(userId);

    // Determine last agent and intent
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastMessage = assistantMessages[assistantMessages.length - 1];

    return {
      user_id: userId,
      session_id: sessionId,
      business_profile: businessProfile || undefined,
      message_history: messages,
      last_agent_used: lastMessage?.agent_used as AgentType,
      last_intent: lastMessage?.intent as Intent
    };
  }

  /**
   * Run Master Agent for intent detection and routing
   */
  private async runMasterAgent(state: AgentState): Promise<AgentState> {
    try {
      const decision = await masterAgent.processMessage(state.userMessage, state.context);
      
      state.intent = decision.intent;
      state.selectedAgent = decision.selected_agent;

      logger.info('Master Agent decision', {
        intent: state.intent,
        agent: state.selectedAgent,
        reasoning: decision.reasoning
      });

      return state;
    } catch (error: any) {
      logger.error('Master Agent failed', { error: error.message });
      
      // Fallback to Discovery Agent
      state.intent = Intent.GENERAL_CHAT;
      state.selectedAgent = AgentType.DISCOVERY;
      
      return state;
    }
  }

  /**
   * Run the selected worker agent
   */
  private async runWorkerAgent(state: AgentState, uploadedFile?: any): Promise<AgentState> {
    try {
      const agent = state.selectedAgent;
      let response: AgentResponse;

      switch (agent) {
        case AgentType.DISCOVERY:
          response = await discoveryAgent.process(state.userMessage, state.context);
          break;

        case AgentType.PROFILE_BUILDER:
          response = await profileBuilderAgent.process(state.userMessage, state.context);
          break;

        case AgentType.RULE_ENGINE_INTERFACE:
          response = await ruleEngineInterfaceAgent.process(state.userMessage, state.context);
          break;

        case AgentType.COMPLIANCE_EXPLAINER:
          response = await complianceExplainerAgent.process(state.userMessage, state.context);
          break;

        case AgentType.TIMELINE_PLANNER:
          response = await timelinePlannerAgent.process(state.userMessage, state.context);
          break;

        case AgentType.PLATFORM_ONBOARDING:
          response = await platformOnboardingAgent.process(state.userMessage, state.context);
          break;

        case AgentType.COST_RISK:
          response = await costRiskAgent.process(state.userMessage, state.context);
          break;

        case AgentType.DOCUMENT:
          response = await documentAgent.process(state.userMessage, state.context, uploadedFile);
          break;

        case AgentType.NOTIFICATION:
          response = await notificationAgent.process(state.userMessage, state.context);
          break;

        default:
          // Default to Discovery Agent for unknown cases
          response = await discoveryAgent.process(state.userMessage, state.context);
      }

      state.response = response;
      state.isComplete = true;

      return state;

    } catch (error: any) {
      logger.error('Worker Agent failed', { error: error.message, agent: state.selectedAgent });
      
      state.response = {
        message: 'I had trouble processing your request. Let me try a different approach. Could you rephrase your question?',
        agent_used: state.selectedAgent || AgentType.MASTER,
        intent: state.intent || Intent.UNKNOWN
      };
      state.isComplete = true;

      return state;
    }
  }

  /**
   * Save user message to database
   */
  private async saveUserMessage(state: AgentState): Promise<void> {
    try {
      await messageRepo.createMessage({
        session_id: state.sessionId,
        role: 'user',
        content: state.userMessage,
        metadata: {}
      });
    } catch (error: any) {
      logger.error('Failed to save user message', { error: error.message });
    }
  }

  /**
   * Save assistant message to database
   */
  private async saveAssistantMessage(state: AgentState): Promise<void> {
    try {
      if (state.response) {
        await messageRepo.createMessage({
          session_id: state.sessionId,
          role: 'assistant',
          content: state.response.message,
          agent_used: state.response.agent_used,
          intent: state.response.intent,
          metadata: state.response.metadata || {}
        });
      }
    } catch (error: any) {
      logger.error('Failed to save assistant message', { error: error.message });
    }
  }

  /**
   * Check if intent is compliance-related
   */
  private isComplianceRelated(intent?: Intent): boolean {
    const complianceIntents = [
      Intent.COMPLIANCE_QUERY,
      Intent.COST_QUERY,
      Intent.TIMELINE_QUERY,
      Intent.PLATFORM_QUERY
    ];

    return intent ? complianceIntents.includes(intent) : false;
  }

  /**
   * Add legal disclaimer to response
   */
  private addDisclaimer(message: string): string {
    if (message.includes('not legal advice') || message.includes('Disclaimer')) {
      return message;
    }

    return message + '\n\n---\n*Disclaimer: This is guidance based on public information and is not a substitute for professional legal advice. Always consult with a qualified professional for your specific situation.*';
  }

  /**
   * Create or get active session for user
   */
  async getOrCreateSession(userId: string): Promise<string> {
    // Try to get existing active session
    const existingSession = await sessionRepo.getActiveSessionForUser(userId);
    
    if (existingSession) {
      return existingSession.id;
    }

    // Create new session
    const newSession = await sessionRepo.createSession(userId);
    return newSession.id;
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    await sessionRepo.endSession(sessionId);
    logger.info('Session ended', { sessionId });
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<Message[]> {
    return await messageRepo.getMessagesBySession(sessionId);
  }
}

// Singleton export
export default new AgentOrchestrator();
