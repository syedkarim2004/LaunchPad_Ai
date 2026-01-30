import ruleEngine from '../utils/ruleEngine';
import llmProvider from '../utils/llmProvider';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Platform Onboarding Agent
 * Responsibilities:
 * - Guide users through Swiggy, Zomato, Amazon, Flipkart onboarding
 * - Check eligibility based on compliances
 * - Provide step-by-step onboarding instructions
 * - Explain rejection reasons and how to avoid them
 */
class PlatformOnboardingAgent {
  private readonly SYSTEM_PROMPT = `You are the Platform Onboarding Agent for a business compliance chatbot.

Your role is to help users understand platform onboarding requirements and guide them through the process.

IMPORTANT RULES:
- Use official platform requirement data provided
- Be specific about eligibility criteria
- Explain common rejection reasons
- Provide actionable steps
- NEVER guarantee approval
- Always mention that requirements may change

Structure your response:
1. Platform overview
2. Eligibility check based on user's compliances
3. Required documents
4. Step-by-step onboarding process
5. Costs and commission structure
6. Common rejection reasons
7. Timeline estimate
8. Contact information`;

  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      const platformName = this.extractPlatformName(userMessage);

      if (!platformName) {
        return {
          message: this.listAvailablePlatforms(),
          agent_used: AgentType.PLATFORM_ONBOARDING,
          intent: Intent.PLATFORM_QUERY,
          requires_followup: true
        };
      }

      const platformReq = ruleEngine.getPlatformRequirements(platformName);
      
      if (!platformReq) {
        return {
          message: `I don't have detailed information about ${platformName} yet. I can help you with:\n- Swiggy\n- Zomato\n- Amazon\n- Flipkart\n\nWhich one would you like to know about?`,
          agent_used: AgentType.PLATFORM_ONBOARDING,
          intent: Intent.PLATFORM_QUERY,
          requires_followup: true
        };
      }

      // Check eligibility if we have business profile
      let eligibilityCheck: {
        eligible: boolean;
        missing_compliances: string[];
        message: string;
      } | null = null;
      if (context.business_profile) {
        eligibilityCheck = ruleEngine.checkPlatformEligibility(platformName, context.business_profile);
      }

      const prompt = this.buildPrompt(platformName, platformReq, eligibilityCheck, context);
      
      const response = await llmProvider.generateText(
        prompt,
        this.SYSTEM_PROMPT,
        { temperature: 0.5, max_tokens: 1200 }
      );

      logger.info('Platform Onboarding Agent generated guidance', {
        userId: context.user_id,
        platform: platformName,
        eligible: eligibilityCheck?.eligible
      });

      return {
        message: response.content,
        agent_used: AgentType.PLATFORM_ONBOARDING,
        intent: Intent.PLATFORM_QUERY,
        requires_followup: true,
        metadata: {
          platform: platformName,
          eligibility: eligibilityCheck,
          platform_requirements: platformReq
        }
      };

    } catch (error: any) {
      logger.error('Platform Onboarding Agent error', { error: error.message });
      throw error;
    }
  }

  private buildPrompt(platformName: string, platformReq: any, eligibilityCheck: any, context: ChatContext): string {
    let prompt = `Platform: ${platformName}\n\n`;

    prompt += `Official Platform Requirements:\n`;
    prompt += JSON.stringify(platformReq, null, 2);
    prompt += `\n\n`;

    if (eligibilityCheck) {
      prompt += `Eligibility Check Result:\n`;
      prompt += `- Eligible: ${eligibilityCheck.eligible ? 'YES' : 'NO'}\n`;
      if (eligibilityCheck.missing_compliances.length > 0) {
        prompt += `- Missing Compliances: ${eligibilityCheck.missing_compliances.join(', ')}\n`;
      }
      prompt += `- Message: ${eligibilityCheck.message}\n\n`;
    }

    if (context.business_profile) {
      prompt += `User's Business Profile:\n`;
      const profile = context.business_profile;
      if (profile.business_name) prompt += `- Name: ${profile.business_name}\n`;
      if (profile.business_type) prompt += `- Type: ${profile.business_type}\n`;
      if (profile.state) prompt += `- Location: ${profile.city}, ${profile.state}\n`;
      prompt += `\n`;
    }

    prompt += `Provide comprehensive guidance for onboarding to ${platformName}. Include eligibility status, requirements, step-by-step process, costs, and timeline.`;

    return prompt;
  }

  private extractPlatformName(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    const platforms = ['swiggy', 'zomato', 'amazon', 'flipkart'];
    
    for (const platform of platforms) {
      if (lowerMessage.includes(platform)) {
        return platform.charAt(0).toUpperCase() + platform.slice(1);
      }
    }

    return null;
  }

  private listAvailablePlatforms(): string {
    const platforms = ruleEngine.getAllPlatforms();
    
    let message = `🏪 **Platform Onboarding Guide**\n\n`;
    message += `I can help you onboard to these popular platforms:\n\n`;

    platforms.forEach(platform => {
      message += `**${platform.platform}** (${platform.type})\n`;
      message += `- Required: ${platform.requirements.mandatory_compliance.join(', ')}\n`;
      message += `- Commission: ${platform.estimated_cost.commission}\n`;
      message += `- Timeline: ${platform.estimated_timeline}\n\n`;
    });

    message += `Which platform would you like to know more about?`;

    return message;
  }
}

export default new PlatformOnboardingAgent();
