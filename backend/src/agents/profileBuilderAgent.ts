import { AgentResponse, AgentType, Intent, ChatContext, BusinessProfile } from '../types';
import { businessProfileRepo } from '../database/repositories';
import llmProvider from '../utils/llmProvider';
import logger from '../utils/logger';

/**
 * Profile Builder Agent - Normalizes and structures business data
 * Responsibilities:
 * - Extract structured data from conversation
 * - Infer factual flags (sells_food, online_delivery, etc.)
 * - Validate and update business profile
 * - Identify missing critical information
 */
class ProfileBuilderAgent {
  private readonly SYSTEM_PROMPT = `You are the Profile Builder Agent for a business compliance system.

Your role is to extract structured business information from user messages and update the business profile.

You must respond with ONLY valid JSON in this format:
{
  "updates": {
    "business_name": "string or null",
    "business_idea": "string or null",
    "business_type": "string or null",
    "state": "string or null",
    "city": "string or null",
    "annual_turnover": number or null,
    "employee_count": number or null,
    "sells_food": boolean or null,
    "online_delivery": boolean or null,
    "has_physical_store": boolean or null,
    "product_category": ["array", "of", "strings"] or null,
    "target_platforms": ["array", "of", "platforms"] or null
  },
  "missing_fields": ["array of important missing fields"],
  "confidence": "high|medium|low",
  "summary": "Brief summary of what was extracted"
}

IMPORTANT:
- Only include fields that you can extract from the message
- Infer boolean flags logically (e.g., "restaurant" → sells_food: true)
- Set fields to null if not mentioned
- Be conservative with extraction - don't guess
- Identify critical missing information for compliance checking`;

  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      const prompt = this.buildPrompt(userMessage, context);
      
      const extraction = await llmProvider.generateJSON<{
        updates: Partial<BusinessProfile>;
        missing_fields: string[];
        confidence: string;
        summary: string;
      }>(
        prompt,
        this.SYSTEM_PROMPT,
        { temperature: 0.2, max_tokens: 800 }
      );

      logger.info('Profile Builder extracted data', {
        userId: context.user_id,
        fieldsExtracted: Object.keys(extraction.updates).length
      });

      // Update database if we have a profile
      let profile = context.business_profile;
      
      if (profile && Object.keys(extraction.updates).length > 0) {
        profile = await businessProfileRepo.updateProfile(profile.id, extraction.updates);
      } else if (!profile && context.user_id) {
        // Create new profile
        profile = await businessProfileRepo.createProfile({
          user_id: context.user_id,
          ...extraction.updates
        } as any);
      }

      // Build response message
      let message = `✅ I've updated your business profile!\n\n`;
      message += `**Summary:** ${extraction.summary}\n\n`;

      if (extraction.missing_fields.length > 0) {
        message += `**To provide better guidance, I'd like to know:**\n`;
        extraction.missing_fields.slice(0, 3).forEach(field => {
          message += `- ${this.formatFieldName(field)}\n`;
        });
        message += '\nCould you provide some of this information?';
      } else {
        message += `Great! I have enough information to check applicable compliances. Would you like me to do that now?`;
      }

      return {
        message,
        agent_used: AgentType.PROFILE_BUILDER,
        intent: Intent.PROFILE_UPDATE,
        requires_followup: extraction.missing_fields.length > 0,
        metadata: {
          updates: extraction.updates,
          missing_fields: extraction.missing_fields,
          confidence: extraction.confidence
        }
      };

    } catch (error: any) {
      logger.error('Profile Builder Agent error', { error: error.message });
      throw error;
    }
  }

  private buildPrompt(userMessage: string, context: ChatContext): string {
    let prompt = `User Message: "${userMessage}"\n\n`;

    // Add current profile context
    if (context.business_profile) {
      prompt += 'Current Business Profile:\n';
      prompt += JSON.stringify(context.business_profile, null, 2);
      prompt += '\n\n';
    }

    // Add conversation history for context
    if (context.message_history.length > 0) {
      const recentMessages = context.message_history.slice(-6);
      prompt += 'Recent conversation (for context):\n';
      recentMessages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content.substring(0, 150)}\n`;
      });
      prompt += '\n';
    }

    prompt += 'Extract structured business information from the user message and recent conversation. Only extract information you are confident about.';

    return prompt;
  }

  private formatFieldName(field: string): string {
    const fieldNames: Record<string, string> = {
      'business_name': 'Your business name',
      'business_type': 'Type of business (e.g., Restaurant, Retail, Manufacturing)',
      'state': 'Which state you operate in',
      'city': 'Your city',
      'annual_turnover': 'Expected annual turnover',
      'employee_count': 'Number of employees',
      'sells_food': 'Whether you sell food items',
      'online_delivery': 'If you plan online delivery',
      'has_physical_store': 'Whether you have a physical store',
      'product_category': 'Product categories you deal with',
      'target_platforms': 'Platforms you want to onboard (Swiggy, Amazon, etc.)'
    };

    return fieldNames[field] || field;
  }
}

export default new ProfileBuilderAgent();
