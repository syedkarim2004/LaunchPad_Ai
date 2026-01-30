import llmProvider from '../utils/llmProvider';
import ruleEngine from '../utils/ruleEngine';
import { AgentResponse, AgentType, Intent, ChatContext, Document } from '../types';
import { documentRepo } from '../database/repositories';
import logger from '../utils/logger';

/**
 * Document Agent (CRITICAL AGENT)
 * Responsibilities:
 * - Identify document types (PAN, Aadhaar, GST Certificate, Rent Agreement, etc.)
 * - Extract basic metadata
 * - Map documents to compliance relevance
 * - Use chat context + business profile + rule engine output
 */
class DocumentAgent {
  private readonly SYSTEM_PROMPT = `You are the Document Agent for a business compliance chatbot.

Your role is to identify, analyze, and explain the relevance of documents for business compliance.

For document identification, respond with JSON:
{
  "document_type": "PAN Card|Aadhaar Card|GST Certificate|FSSAI License|Trade License|Rent Agreement|Bank Statement|Address Proof|Photo ID|Other",
  "confidence": "high|medium|low",
  "extracted_info": {
    "name": "if identifiable",
    "number": "document number if visible",
    "valid_until": "expiry date if applicable",
    "other_details": "any other relevant info"
  },
  "compliance_relevance": ["array of compliance IDs this document is needed for"],
  "usage_notes": "Brief note about how this document will be used"
}

For document queries, explain clearly:
- What documents are needed for specific compliances
- Why each document is required
- Alternatives if applicable
- Common issues with documents

IMPORTANT:
- Be accurate about document identification
- Explain relevance to business compliance
- Do not make assumptions about document validity`;

  async process(userMessage: string, context: ChatContext, uploadedFile?: any): Promise<AgentResponse> {
    try {
      // Determine if this is upload or query
      const isDocumentUpload = uploadedFile !== undefined || 
        userMessage.toLowerCase().includes('uploaded') ||
        userMessage.toLowerCase().includes('this document');

      if (isDocumentUpload && uploadedFile) {
        return await this.handleDocumentUpload(uploadedFile, context);
      } else {
        return await this.handleDocumentQuery(userMessage, context);
      }

    } catch (error: any) {
      logger.error('Document Agent error', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle document upload analysis
   */
  private async handleDocumentUpload(file: any, context: ChatContext): Promise<AgentResponse> {
    logger.info('Processing document upload', { 
      userId: context.user_id,
      fileName: file.name 
    });

    // Extract file information
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.mimetype
    };

    const prompt = `A user has uploaded a file:
Name: ${fileInfo.name}
Type: ${fileInfo.type}
Size: ${fileInfo.size} bytes

Based on the filename and type, identify what kind of document this is and its relevance to business compliance. Respond with JSON only.`;

    const analysis = await llmProvider.generateJSON<{
      document_type: string;
      confidence: string;
      extracted_info: any;
      compliance_relevance: string[];
      usage_notes: string;
    }>(prompt, this.SYSTEM_PROMPT, { temperature: 0.3 });

    // Get compliance details for relevant compliances
    const relevantCompliances = analysis.compliance_relevance
      .map(id => ruleEngine.getComplianceById(id))
      .filter(Boolean);

    // Build response
    let message = `📄 **Document Analysis**\n\n`;
    message += `**File:** ${fileInfo.name}\n`;
    message += `**Identified As:** ${analysis.document_type}\n`;
    message += `**Confidence:** ${analysis.confidence}\n\n`;

    if (analysis.compliance_relevance.length > 0) {
      message += `**Compliance Relevance:**\n`;
      message += `This document is needed for:\n`;
      relevantCompliances.forEach(comp => {
        if (comp) {
          message += `- ✅ **${comp.name}** - ${comp.description.substring(0, 100)}...\n`;
        }
      });
      message += `\n`;
    } else {
      message += `**Compliance Relevance:**\n`;
      message += `This document may not be directly required for your current business setup, but keep it handy as it could be needed for:\n`;
      message += `- Identity verification\n`;
      message += `- Bank account opening\n`;
      message += `- Future compliance requirements\n\n`;
    }

    message += `**Notes:** ${analysis.usage_notes}\n\n`;
    message += `Would you like to upload another document or know what else you need?`;

    return {
      message,
      agent_used: AgentType.DOCUMENT,
      intent: Intent.DOCUMENT_UPLOAD,
      requires_followup: true,
      metadata: {
        document_type: analysis.document_type,
        compliance_relevance: analysis.compliance_relevance,
        file_info: fileInfo
      }
    };
  }

  /**
   * Handle queries about documents
   */
  private async handleDocumentQuery(userMessage: string, context: ChatContext): Promise<AgentResponse> {
    logger.info('Processing document query', { userId: context.user_id });

    // Get applicable compliances for document requirements
    const compliances = context.business_profile 
      ? ruleEngine.getApplicableCompliances(context.business_profile)
      : [];

    // Build document requirements map
    const documentMap: Map<string, string[]> = new Map();
    
    compliances.forEach(comp => {
      comp.documents_required.forEach(doc => {
        if (!documentMap.has(doc)) {
          documentMap.set(doc, []);
        }
        documentMap.get(doc)!.push(comp.name);
      });
    });

    const prompt = `User Question: "${userMessage}"

${compliances.length > 0 ? `
Documents Required for User's Business:
${Array.from(documentMap.entries()).map(([doc, comps]) => 
  `- ${doc}: needed for ${comps.join(', ')}`
).join('\n')}
` : ''}

Provide a helpful response about documents needed for business compliance. Be specific about what documents are needed and why.`;

    const response = await llmProvider.generateText(
      prompt,
      this.SYSTEM_PROMPT.replace('respond with JSON', 'respond conversationally'),
      { temperature: 0.6, max_tokens: 800 }
    );

    // If we have specific document requirements, add them
    let message = response.content + '\n\n';

    if (documentMap.size > 0) {
      message += `**📋 Quick Document Checklist:**\n`;
      Array.from(documentMap.entries()).forEach(([doc, comps]) => {
        message += `- [ ] ${doc} _(for ${comps.join(', ')})_\n`;
      });
      message += `\nWould you like to upload any of these documents for verification?`;
    }

    return {
      message,
      agent_used: AgentType.DOCUMENT,
      intent: Intent.DOCUMENT_QUERY,
      requires_followup: true,
      metadata: {
        document_requirements: Object.fromEntries(documentMap)
      }
    };
  }

  /**
   * Analyze a specific document type and its relevance
   */
  async analyzeDocumentType(documentType: string, context: ChatContext): Promise<{
    required_for: string[];
    importance: string;
    tips: string[];
  }> {
    const compliances = context.business_profile 
      ? ruleEngine.getApplicableCompliances(context.business_profile)
      : [];

    const requiredFor = compliances
      .filter(c => c.documents_required.includes(documentType))
      .map(c => c.name);

    return {
      required_for: requiredFor,
      importance: requiredFor.length > 0 ? 'Required' : 'Not currently required',
      tips: [
        'Keep both digital and physical copies',
        'Ensure document is not expired',
        'Check for correct name spelling across documents'
      ]
    };
  }
}

export default new DocumentAgent();
