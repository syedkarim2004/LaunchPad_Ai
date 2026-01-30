import ruleEngine from '../utils/ruleEngine';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import { complianceResultRepo } from '../database/repositories';
import logger from '../utils/logger';

/**
 * Rule Engine Interface Agent
 * Responsibilities:
 * - Fetch applicable compliances from rule engine
 * - READ-ONLY access to rules
 * - Store results in database
 * - Present results to user in friendly format
 * - NEVER modifies rules or makes legal decisions
 */
class RuleEngineInterfaceAgent {
  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      if (!context.business_profile) {
        return {
          message: 'I need more information about your business before I can check compliances. Let me ask you a few questions first!',
          agent_used: AgentType.RULE_ENGINE_INTERFACE,
          intent: Intent.COMPLIANCE_QUERY,
          requires_followup: true
        };
      }

      logger.info('Fetching applicable compliances', { 
        userId: context.user_id,
        profileId: context.business_profile.id 
      });

      // Get applicable compliances from rule engine
      const compliances = ruleEngine.getApplicableCompliances(context.business_profile);
      const mandatory = compliances.filter(c => c.mandatory);
      const optional = compliances.filter(c => !c.mandatory);

      // Save to database
      for (const compliance of compliances) {
        await complianceResultRepo.saveComplianceResult({
          business_profile_id: context.business_profile.id,
          compliance_id: compliance.id,
          compliance_name: compliance.name,
          level: compliance.level,
          is_mandatory: compliance.mandatory,
          status: 'pending',
          documents_required: compliance.documents_required,
          estimated_cost: compliance.estimated_cost.max,
          estimated_timeline: compliance.estimated_timeline,
          authority: compliance.authority
        });
      }

      // Calculate total cost
      const costEstimate = ruleEngine.calculateTotalCost(compliances);

      // Build response message
      let message = `📋 **Compliance Analysis Complete!**\n\n`;
      message += `Based on your business profile, here's what you need:\n\n`;

      // Mandatory compliances
      if (mandatory.length > 0) {
        message += `**✅ Mandatory Compliances (${mandatory.length}):**\n`;
        mandatory.forEach((comp, idx) => {
          message += `${idx + 1}. **${comp.name}**\n`;
          message += `   - Authority: ${comp.authority}\n`;
          message += `   - Timeline: ${comp.estimated_timeline}\n`;
          message += `   - Cost: ₹${comp.estimated_cost.min} - ₹${comp.estimated_cost.max}\n`;
          if (comp.penalty) {
            message += `   - ⚠️ Penalty for non-compliance: ${comp.penalty}\n`;
          }
          message += `\n`;
        });
      }

      // Optional/recommended compliances
      if (optional.length > 0) {
        message += `**💡 Recommended Compliances (${optional.length}):**\n`;
        optional.forEach((comp, idx) => {
          message += `${idx + 1}. ${comp.name} - ${comp.description.substring(0, 100)}...\n`;
        });
        message += `\n`;
      }

      // Cost summary
      message += `**💰 Total Estimated Cost:** ₹${costEstimate.min.toLocaleString('en-IN')} - ₹${costEstimate.max.toLocaleString('en-IN')}\n\n`;

      // Next steps
      message += `**What would you like to do next?**\n`;
      message += `- Get detailed explanation of any compliance\n`;
      message += `- See a week-by-week implementation timeline\n`;
      message += `- Check platform onboarding requirements\n`;
      message += `- Upload documents for verification\n\n`;

      message += `*Disclaimer: This is guidance based on public information and is not legal advice.*`;

      return {
        message,
        agent_used: AgentType.RULE_ENGINE_INTERFACE,
        intent: Intent.COMPLIANCE_QUERY,
        requires_followup: true,
        metadata: {
          total_compliances: compliances.length,
          mandatory_count: mandatory.length,
          optional_count: optional.length,
          cost_estimate: costEstimate,
          compliance_ids: compliances.map(c => c.id)
        }
      };

    } catch (error: any) {
      logger.error('Rule Engine Interface Agent error', { error: error.message });
      throw error;
    }
  }
}

export default new RuleEngineInterfaceAgent();
