import { AgentResponse, AgentType, Intent, ChatContext } from '../types';
import logger from '../utils/logger';

/**
 * Notification Agent
 * Responsibilities:
 * - Schedule reminders for compliance deadlines
 * - Integrate with n8n / cron (mock implementation)
 * - Track notification preferences
 * - Generate renewal reminders
 */
class NotificationAgent {
  private mockScheduledNotifications: Array<{
    userId: string;
    type: string;
    scheduledFor: Date;
    message: string;
    status: 'scheduled' | 'sent' | 'cancelled';
  }> = [];

  async process(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    try {
      // Determine notification intent
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('remind') || lowerMessage.includes('notification')) {
        return await this.handleReminderSetup(userMessage, context);
      } else if (lowerMessage.includes('schedule') || lowerMessage.includes('deadline')) {
        return await this.handleDeadlineCheck(context);
      } else {
        return await this.showNotificationOptions(context);
      }

    } catch (error: any) {
      logger.error('Notification Agent error', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up a reminder
   */
  private async handleReminderSetup(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    logger.info('Setting up reminder', { userId: context.user_id });

    // Mock implementation - in production, integrate with n8n/cron
    const reminder = {
      userId: context.user_id,
      type: 'compliance_reminder',
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      message: 'Time to check your compliance status!',
      status: 'scheduled' as const
    };

    this.mockScheduledNotifications.push(reminder);

    const message = `🔔 **Reminder Scheduled!**

I've set up the following reminders for you:

**Compliance Check Reminder**
- Scheduled for: ${reminder.scheduledFor.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
- Type: ${reminder.type}

**What I can remind you about:**
- 📅 Compliance filing deadlines
- 🔄 License renewal dates
- 📝 Document submission deadlines
- 💰 Tax payment dates

**Note:** This is a demo notification. In production, you would receive:
- Email notifications
- SMS reminders
- In-app push notifications

Would you like to set up more reminders or customize notification preferences?`;

    return {
      message,
      agent_used: AgentType.NOTIFICATION,
      intent: Intent.STATUS_QUERY,
      requires_followup: true,
      metadata: {
        reminder_created: true,
        reminder_details: reminder
      }
    };
  }

  /**
   * Check and display upcoming deadlines
   */
  private async handleDeadlineCheck(context: ChatContext): Promise<AgentResponse> {
    logger.info('Checking deadlines', { userId: context.user_id });

    // Mock deadlines based on common compliance requirements
    const mockDeadlines = [
      {
        compliance: 'GST Return Filing',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        priority: 'high'
      },
      {
        compliance: 'FSSAI License Renewal',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        priority: 'medium'
      },
      {
        compliance: 'Trade License Renewal',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        priority: 'low'
      }
    ];

    let message = `📅 **Upcoming Deadlines & Reminders**\n\n`;

    // Group by priority
    const highPriority = mockDeadlines.filter(d => d.priority === 'high');
    const mediumPriority = mockDeadlines.filter(d => d.priority === 'medium');
    const lowPriority = mockDeadlines.filter(d => d.priority === 'low');

    if (highPriority.length > 0) {
      message += `**🔴 Urgent (Next 30 days):**\n`;
      highPriority.forEach(d => {
        message += `- ${d.compliance}: ${d.deadline.toLocaleDateString('en-IN')}\n`;
      });
      message += `\n`;
    }

    if (mediumPriority.length > 0) {
      message += `**🟡 Upcoming (30-90 days):**\n`;
      mediumPriority.forEach(d => {
        message += `- ${d.compliance}: ${d.deadline.toLocaleDateString('en-IN')}\n`;
      });
      message += `\n`;
    }

    if (lowPriority.length > 0) {
      message += `**🟢 Later (90+ days):**\n`;
      lowPriority.forEach(d => {
        message += `- ${d.compliance}: ${d.deadline.toLocaleDateString('en-IN')}\n`;
      });
      message += `\n`;
    }

    message += `**🔔 Notification Settings:**\n`;
    message += `- Email reminders: ✅ Enabled\n`;
    message += `- SMS alerts: ⚠️ Not configured\n`;
    message += `- Push notifications: ✅ Enabled\n\n`;

    message += `Would you like me to set up reminders for any specific deadline?`;

    return {
      message,
      agent_used: AgentType.NOTIFICATION,
      intent: Intent.STATUS_QUERY,
      requires_followup: true,
      metadata: {
        deadlines: mockDeadlines
      }
    };
  }

  /**
   * Show notification options
   */
  private async showNotificationOptions(context: ChatContext): Promise<AgentResponse> {
    const message = `🔔 **Notification & Reminder Services**

I can help you stay on top of your compliance deadlines!

**Available Reminders:**
1. 📅 **Filing Deadlines** - GST returns, annual filings
2. 🔄 **License Renewals** - FSSAI, Trade License, etc.
3. 💰 **Payment Reminders** - Tax payments, fee renewals
4. 📝 **Document Expiry** - Track document validity

**How to Set Up:**
- Say "Remind me about GST filing"
- Say "Show my upcoming deadlines"
- Say "Set up monthly reminders"

**Integration Options (Production):**
- Email notifications
- SMS alerts
- WhatsApp messages
- Calendar integration

What would you like me to help you with?`;

    return {
      message,
      agent_used: AgentType.NOTIFICATION,
      intent: Intent.STATUS_QUERY,
      requires_followup: true
    };
  }

  /**
   * Mock: Get scheduled notifications for a user
   */
  getScheduledNotifications(userId: string) {
    return this.mockScheduledNotifications.filter(n => n.userId === userId && n.status === 'scheduled');
  }
}

export default new NotificationAgent();
