import ruleEngine from '../utils/ruleEngine';
import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Timeline Planner Agent
 * Responsibilities:
 * - Generate week-by-week implementation plan
 * - Respect compliance dependencies (e.g., FSSAI before Swiggy)
 * - Provide realistic timelines based on rule data
 * - Break down parallel vs sequential tasks
 */
class TimelinePlannerAgent {
  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      if (!context.business_profile) {
        return {
          message: 'I need your business information first to create a timeline. Let\'s start by understanding your business!',
          agent_used: AgentType.TIMELINE_PLANNER,
          intent: Intent.TIMELINE_QUERY,
          requires_followup: true
        };
      }

      logger.info('Generating timeline', { 
        userId: context.user_id,
        profileId: context.business_profile.id 
      });

      // Get applicable compliances
      const compliances = ruleEngine.getApplicableCompliances(context.business_profile);
      
      if (compliances.length === 0) {
        return {
          message: 'Based on your current business profile, I couldn\'t identify specific compliances. Could you provide more details about your business?',
          agent_used: AgentType.TIMELINE_PLANNER,
          intent: Intent.TIMELINE_QUERY,
          requires_followup: true
        };
      }

      // Generate timeline
      const timeline = ruleEngine.generateTimeline(compliances);
      
      // Build response message
      let message = `📅 **Week-by-Week Implementation Timeline**\n\n`;
      message += `Based on your business profile, here's a recommended timeline to get all compliances in place:\n\n`;

      timeline.forEach((item, idx) => {
        message += `### Week ${item.week}: ${item.compliance}\n`;
        
        if (item.actions && item.actions.length > 0) {
          message += `**Actions:**\n`;
          item.actions.slice(0, 5).forEach(action => {
            message += `- ${action}\n`;
          });
        }
        
        message += `\n`;
      });

      // Add summary
      const totalWeeks = Math.max(...timeline.map(t => t.week));
      message += `**📊 Summary:**\n`;
      message += `- Total Compliances: ${compliances.length}\n`;
      message += `- Estimated Total Time: ${totalWeeks} weeks\n`;
      message += `- Can be optimized by working on independent compliances in parallel\n\n`;

      message += `**💡 Pro Tips:**\n`;
      message += `- Start with compliances that have dependencies (like FSSAI if you need it for food delivery platforms)\n`;
      message += `- Gather all documents beforehand to speed up the process\n`;
      message += `- Some registrations can be done simultaneously\n`;
      message += `- Keep digital and physical copies of all certificates\n\n`;

      message += `Would you like detailed guidance on any specific compliance?`;

      return {
        message,
        agent_used: AgentType.TIMELINE_PLANNER,
        intent: Intent.TIMELINE_QUERY,
        requires_followup: true,
        metadata: {
          total_weeks: totalWeeks,
          total_compliances: compliances.length,
          timeline
        }
      };

    } catch (error: any) {
      logger.error('Timeline Planner Agent error', { error: error.message });
      throw error;
    }
  }
}

export default new TimelinePlannerAgent();
