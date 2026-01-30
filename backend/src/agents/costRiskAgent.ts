import ruleEngine from '../utils/ruleEngine';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Cost & Risk Agent
 * Responsibilities:
 * - Calculate approximate compliance costs
 * - Show penalties from rule data
 * - Provide cost breakdown by compliance
 * - NO scare tactics, just factual information
 */
class CostRiskAgent {
  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      if (!context.business_profile) {
        return {
          message: 'To provide accurate cost estimates, I need to know more about your business first. Could you tell me about your business idea?',
          agent_used: AgentType.COST_RISK,
          intent: Intent.COST_QUERY,
          requires_followup: true
        };
      }

      logger.info('Calculating costs and risks', { 
        userId: context.user_id,
        profileId: context.business_profile.id 
      });

      // Get applicable compliances
      const compliances = ruleEngine.getApplicableCompliances(context.business_profile);
      
      if (compliances.length === 0) {
        return {
          message: 'Based on your current business profile, I couldn\'t identify specific compliances to estimate costs. Could you provide more details about your business?',
          agent_used: AgentType.COST_RISK,
          intent: Intent.COST_QUERY,
          requires_followup: true
        };
      }

      // Calculate total cost
      const totalCost = ruleEngine.calculateTotalCost(compliances);
      
      // Build detailed cost breakdown
      let message = `💰 **Cost & Fee Breakdown**\n\n`;
      message += `Based on your business profile, here's the estimated cost breakdown:\n\n`;

      // Detailed breakdown by compliance
      message += `**📋 Compliance-wise Costs:**\n\n`;
      
      let tableData: string[] = [];
      compliances.forEach(comp => {
        const minCost = comp.estimated_cost.min;
        const maxCost = comp.estimated_cost.max;
        const mandatory = comp.mandatory ? '✅ Mandatory' : '⭐ Recommended';
        
        message += `**${comp.name}** (${mandatory})\n`;
        message += `- Cost: ₹${minCost.toLocaleString('en-IN')}`;
        if (minCost !== maxCost) {
          message += ` - ₹${maxCost.toLocaleString('en-IN')}`;
        }
        message += `\n`;
        message += `- Timeline: ${comp.estimated_timeline}\n`;
        
        if (comp.penalty) {
          message += `- ⚠️ Non-compliance penalty: ${comp.penalty}\n`;
        }
        
        message += `\n`;
      });

      // Total summary
      message += `---\n\n`;
      message += `**📊 Total Estimated Costs:**\n`;
      message += `- Minimum: ₹${totalCost.min.toLocaleString('en-IN')}\n`;
      message += `- Maximum: ₹${totalCost.max.toLocaleString('en-IN')}\n\n`;

      // Additional costs
      message += `**📌 Additional Considerations:**\n`;
      message += `- Professional fees (CA/Lawyer) may add 20-50% to the above\n`;
      message += `- Some compliances require annual renewal fees\n`;
      message += `- Document preparation costs not included\n`;
      message += `- Platform commissions are separate from compliance costs\n\n`;

      // Penalty summary
      const compliancesWithPenalties = compliances.filter(c => c.penalty);
      if (compliancesWithPenalties.length > 0) {
        message += `**⚠️ Penalty Summary:**\n`;
        message += `_Operating without proper compliances may result in:_\n`;
        compliancesWithPenalties.forEach(comp => {
          message += `- ${comp.name}: ${comp.penalty}\n`;
        });
        message += `\n`;
      }

      // Positive note
      message += `**💡 Money-Saving Tips:**\n`;
      message += `- Apply for Udyam Registration (free) to access MSME benefits\n`;
      message += `- Many registrations can be done online without intermediaries\n`;
      message += `- Prepare documents in advance to avoid delays\n`;
      message += `- Check for state-specific subsidies for new businesses\n\n`;

      message += `Would you like detailed steps for any specific compliance or help with cost planning?`;

      return {
        message,
        agent_used: AgentType.COST_RISK,
        intent: Intent.COST_QUERY,
        requires_followup: true,
        metadata: {
          total_cost: totalCost,
          compliance_count: compliances.length,
          compliances_with_penalties: compliancesWithPenalties.length
        }
      };

    } catch (error: any) {
      logger.error('Cost & Risk Agent error', { error: error.message });
      throw error;
    }
  }
}

export default new CostRiskAgent();
