import llmProvider from '../utils/llmProvider';
import ruleEngine from '../utils/ruleEngine';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Compliance Explainer Agent
 * Responsibilities:
 * - Explain why specific compliances apply
 * - Use simple, non-technical language
 * - Cite rule source metadata
 * - Break down complex regulations
 * - NEVER make new legal interpretations
 */
class ComplianceExplainerAgent {
  private readonly SYSTEM_PROMPT = `You are the Compliance Explainer Agent for a business compliance chatbot.

Your role is to explain compliance requirements in simple, easy-to-understand language.

IMPORTANT RULES:
- Use the provided official compliance information ONLY
- Break down complex legal terms into simple language
- Explain WHY the compliance applies to their specific business
- Cite the authority and source
- Use examples when helpful
- NEVER make new legal interpretations
- NEVER give advice beyond what's in the official rule data
- Always add disclaimer about consulting professionals

Structure your explanation:
1. What is this compliance?
2. Why does it apply to your business?
3. What you need to do
4. Timeline and cost
5. Penalties for non-compliance (if any)
6. Where to get it done`;

  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      // Extract compliance name/ID from message
      const complianceId = this.extractComplianceReference(userMessage);
      
      let complianceRule;
      if (complianceId) {
        complianceRule = ruleEngine.getComplianceById(complianceId);
      }

      // If no specific compliance, search by keyword
      if (!complianceRule) {
        const keywords = ['gst', 'fssai', 'license', 'registration', 'shops', 'trade'];
        for (const keyword of keywords) {
          if (userMessage.toLowerCase().includes(keyword)) {
            const results = ruleEngine.searchRules(keyword);
            if (results.length > 0) {
              complianceRule = results[0];
              break;
            }
          }
        }
      }

      if (!complianceRule) {
        return {
          message: 'I\'m not sure which compliance you\'re asking about. Could you be more specific? For example, you can ask about GST, FSSAI, Trade License, etc.',
          agent_used: AgentType.COMPLIANCE_EXPLAINER,
          intent: Intent.COMPLIANCE_QUERY,
          requires_followup: true
        };
      }

      const prompt = this.buildPrompt(userMessage, complianceRule, context);
      
      const response = await llmProvider.generateText(
        prompt,
        this.SYSTEM_PROMPT,
        { temperature: 0.5, max_tokens: 1000 }
      );

      logger.info('Compliance Explainer generated explanation', {
        userId: context.user_id,
        complianceId: complianceRule.id
      });

      // Add disclaimer
      const finalMessage = response.content + '\n\n*This is guidance based on public information and is not a substitute for professional legal advice.*';

      return {
        message: finalMessage,
        agent_used: AgentType.COMPLIANCE_EXPLAINER,
        intent: Intent.COMPLIANCE_QUERY,
        requires_followup: true,
        metadata: {
          compliance_id: complianceRule.id,
          compliance_name: complianceRule.name,
          source: complianceRule.source
        }
      };

    } catch (error: any) {
      logger.error('Compliance Explainer Agent error', { error: error.message });
      throw error;
    }
  }

  private buildPrompt(userMessage: string, complianceRule: any, context: ChatContext): string {
    let prompt = `User Question: "${userMessage}"\n\n`;

    prompt += `Official Compliance Information:\n`;
    prompt += `Name: ${complianceRule.name}\n`;
    prompt += `Level: ${complianceRule.level}\n`;
    prompt += `Mandatory: ${complianceRule.mandatory ? 'Yes' : 'No'}\n`;
    prompt += `Description: ${complianceRule.description}\n`;
    prompt += `Authority: ${complianceRule.authority}\n`;
    prompt += `Timeline: ${complianceRule.estimated_timeline}\n`;
    prompt += `Cost: ₹${complianceRule.estimated_cost.min} - ₹${complianceRule.estimated_cost.max}\n`;
    
    if (complianceRule.penalty) {
      prompt += `Penalty: ${complianceRule.penalty}\n`;
    }

    prompt += `\nDocuments Required:\n`;
    complianceRule.documents_required.forEach((doc: string) => {
      prompt += `- ${doc}\n`;
    });

    if (complianceRule.steps && complianceRule.steps.length > 0) {
      prompt += `\nSteps:\n`;
      complianceRule.steps.forEach((step: string, idx: number) => {
        prompt += `${idx + 1}. ${step}\n`;
      });
    }

    prompt += `\nSource: ${complianceRule.source}\n`;
    prompt += `Last Verified: ${complianceRule.last_verified}\n\n`;

    // Add business context
    if (context.business_profile) {
      prompt += `User's Business Context:\n`;
      const profile = context.business_profile;
      if (profile.business_type) prompt += `- Type: ${profile.business_type}\n`;
      if (profile.state) prompt += `- Location: ${profile.city}, ${profile.state}\n`;
      if (profile.annual_turnover) prompt += `- Turnover: ₹${profile.annual_turnover}\n`;
      if (profile.sells_food) prompt += `- Sells Food: Yes\n`;
      prompt += '\n';
    }

    prompt += `Explain this compliance to the user in simple terms, focusing on why it applies to their business and what they need to do. Use the official information provided above.`;

    return prompt;
  }

  private extractComplianceReference(message: string): string | null {
    const upperMessage = message.toUpperCase();
    
    // Common compliance IDs
    const complianceIds = ['GST', 'FSSAI', 'UDYAM', 'TRADE_MARK', 'KA_SHOPS_ACT', 'MH_SHOPS_ACT', 'KA_TRADE_LICENSE'];
    
    for (const id of complianceIds) {
      if (upperMessage.includes(id) || upperMessage.includes(id.replace('_', ' '))) {
        return id;
      }
    }

    return null;
  }
}

export default new ComplianceExplainerAgent();
