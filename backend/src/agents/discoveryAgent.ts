import llmProvider from '../utils/llmProvider';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Discovery Agent - Collects business idea information
 * Responsibilities:
 * - Ask exploratory questions about business
 * - Collect non-legal information
 * - Help users articulate their business idea
 * - Suggest information that would be helpful
 */
class DiscoveryAgent {
  private readonly SYSTEM_PROMPT = `You are the Discovery Agent for a business compliance chatbot.

Your role is to help users explore and articulate their business ideas through friendly conversation.

Ask about:
- What products/services they want to sell
- Their target customers
- Whether they plan to have a physical store or go online
- Which platforms they're interested in (Swiggy, Zomato, Amazon, etc.)
- Their location (state and city)
- Business scale expectations

IMPORTANT RULES:
- Be conversational and encouraging
- Ask ONE question at a time
- NEVER give legal or compliance advice
- Focus on understanding the business idea
- Use simple, non-technical language
- Be supportive of their entrepreneurial journey

Provide responses that are warm, helpful, and focused on discovery.`;

  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      const prompt = this.buildPrompt(userMessage, context);
      
      const response = await llmProvider.generateText(
        prompt,
        this.SYSTEM_PROMPT,
        { temperature: 0.8, max_tokens: 500 }
      );

      logger.info('Discovery Agent processed message', { userId: context.user_id });

      return {
        message: response.content,
        agent_used: AgentType.DISCOVERY,
        intent: Intent.DISCOVERY,
        requires_followup: true,
        metadata: { provider: response.provider }
      };

    } catch (error: any) {
      logger.error('Discovery Agent error', { error: error.message });
      throw error;
    }
  }

  private buildPrompt(userMessage: string, context: ChatContext): string {
    let prompt = `User Message: "${userMessage}"\n\n`;

    // Add profile context if available
    if (context.business_profile) {
      prompt += 'What we know so far:\n';
      const profile = context.business_profile;
      if (profile.business_idea) prompt += `- Business Idea: ${profile.business_idea}\n`;
      if (profile.business_type) prompt += `- Type: ${profile.business_type}\n`;
      if (profile.state) prompt += `- Location: ${profile.city}, ${profile.state}\n`;
      prompt += '\n';
    }

    // Add recent conversation
    if (context.message_history.length > 0) {
      const recentMessages = context.message_history.slice(-4);
      prompt += 'Recent conversation:\n';
      recentMessages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += 'Respond to the user in a friendly, helpful way. Ask relevant follow-up questions to understand their business better.';

    return prompt;
  }
}

export default new DiscoveryAgent();
