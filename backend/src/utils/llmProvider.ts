import axios from 'axios';
import { LLMResponse, LLMConfig } from '../types';
import logger from './logger';

/**
 * LLM Provider with automatic fallback from Grok to Ollama
 * Implements resilient LLM calling with error handling
 */
class LLMProvider {
  private groqApiKey: string;
  private groqApiUrl: string;
  private groqModel: string;
  private ollamaBaseUrl: string;
  private ollamaModel: string;
  private defaultConfig: LLMConfig;

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || '';
    this.groqApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1';
    this.groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';
    
    this.defaultConfig = {
      model: this.groqModel,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9
    };
  }

  /**
   * Main method to generate text with automatic fallback
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Try Groq first
    try {
      logger.info('Attempting to call Groq API...');
      const response = await this.callGroq(prompt, systemPrompt, finalConfig);
      logger.info('Groq API call successful');
      return response;
    } catch (groqError: any) {
      logger.warn(`Groq API failed: ${groqError.message}. Falling back to Ollama...`);
      
      // Fallback to Ollama
      try {
        const response = await this.callOllama(prompt, systemPrompt, finalConfig);
        logger.info('Ollama fallback successful');
        return response;
      } catch (ollamaError: any) {
        logger.error(`Both Groq and Ollama failed: ${ollamaError.message}`);
        throw new Error('All LLM providers failed. Please check configuration.');
      }
    }
  }

  /**
   * Call Groq API (Primary)
   */
  private async callGroq(
    prompt: string,
    systemPrompt?: string,
    config?: LLMConfig
  ): Promise<LLMResponse> {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      `${this.groqApiUrl}/chat/completions`,
      {
        model: this.groqModel,
        messages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.max_tokens || 2000,
        top_p: config?.top_p || 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      content: response.data.choices[0].message.content,
      provider: 'groq',
      model: this.groqModel,
      tokens_used: response.data.usage?.total_tokens
    };
  }

  /**
   * Call Ollama API (Fallback)
   */
  private async callOllama(
    prompt: string,
    systemPrompt?: string,
    config?: LLMConfig
  ): Promise<LLMResponse> {
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
      : prompt;

    const response = await axios.post(
      `${this.ollamaBaseUrl}/api/generate`,
      {
        model: this.ollamaModel,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: config?.temperature || 0.7,
          num_predict: config?.max_tokens || 2000,
          top_p: config?.top_p || 0.9
        }
      },
      {
        timeout: 60000
      }
    );

    return {
      content: response.data.response,
      provider: 'ollama',
      model: this.ollamaModel
    };
  }

  /**
   * Generate structured JSON output
   */
  async generateJSON<T>(
    prompt: string,
    systemPrompt?: string,
    config?: Partial<LLMConfig>
  ): Promise<T> {
    const enhancedSystemPrompt = `${systemPrompt || ''}\n\nYou must respond with valid JSON only. Do not include any markdown formatting or explanation.`;
    
    const response = await this.generateText(prompt, enhancedSystemPrompt, config);
    
    try {
      // Clean response to extract JSON
      let jsonText = response.content.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const parsed = JSON.parse(jsonText);
      return parsed as T;
    } catch (error) {
      logger.error('Failed to parse JSON from LLM response', { response: response.content });
      throw new Error('LLM did not return valid JSON');
    }
  }

  /**
   * Check if Groq is available
   */
  async healthCheck(): Promise<{ groq: boolean; ollama: boolean }> {
    const health = { groq: false, ollama: false };

    // Check Groq
    try {
      await this.callGroq('test', undefined, { ...this.defaultConfig, max_tokens: 10 });
      health.groq = true;
    } catch (error) {
      health.groq = false;
    }

    // Check Ollama
    try {
      await axios.get(`${this.ollamaBaseUrl}/api/tags`, { timeout: 5000 });
      health.ollama = true;
    } catch (error) {
      health.ollama = false;
    }

    return health;
  }
}

// Singleton instance
export default new LLMProvider();
