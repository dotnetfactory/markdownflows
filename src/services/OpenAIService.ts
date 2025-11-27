import OpenAI from 'openai';
import { SettingsService } from './SettingsService';

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * OpenAI service for AI-powered diagram generation
 */
export class OpenAIService {
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * Check if a model is a GPT-5 variant (uses different API parameters)
   */
  private isGPT5Model(model: string): boolean {
    return model.startsWith('gpt-5') || model.includes('o1') || model.includes('o3');
  }

  /**
   * Build completion parameters based on model type
   * GPT-5 uses max_completion_tokens, older models use max_tokens
   * GPT-5 doesn't support temperature parameter
   */
  private buildCompletionParams(model: string, maxTokens: number, temperature?: number) {
    const isGPT5 = this.isGPT5Model(model);

    const tokenParam = isGPT5
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens };

    const temperatureParam = isGPT5 ? {} : { temperature: temperature ?? 0.7 };

    return { ...tokenParam, ...temperatureParam };
  }

  /**
   * Get an OpenAI client instance
   */
  private getClient(): OpenAI {
    const apiKey = this.settingsService.getOpenAIApiKey();
    if (!apiKey) {
      throw new Error(
        'OpenAI API key not configured. Please set your API key in Settings (click the gear icon).'
      );
    }
    return new OpenAI({ apiKey });
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<IPCResponse<{ model: string; message: string }>> {
    try {
      const client = this.getClient();
      const model = this.settingsService.getOpenAIModel();

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Say "Hello from OpenAI!" in exactly those words.' }],
        ...this.buildCompletionParams(model, 50),
      });

      const message = completion.choices[0]?.message?.content || 'No response';

      return {
        success: true,
        data: { model, message },
      };
    } catch (error) {
      console.error('[OpenAIService] testConnection error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to connect to OpenAI',
          code: 'OPENAI_CONNECTION_ERROR',
        },
      };
    }
  }

  /**
   * Generate or modify a Mermaid diagram based on a user prompt
   * @param prompt The user's description of what to create or modify
   * @param existingDiagram Optional existing diagram content to modify
   */
  async generateMermaidDiagram(
    prompt: string,
    existingDiagram?: string
  ): Promise<IPCResponse<string>> {
    try {
      const client = this.getClient();
      const model = this.settingsService.getOpenAIModel();

      const systemPrompt = `You are an expert at creating Mermaid diagrams. Your task is to generate valid Mermaid diagram code based on the user's description.

RULES:
- Return ONLY the Mermaid diagram code, no explanations or markdown code blocks
- Ensure the diagram syntax is valid and will render correctly
- Use appropriate diagram types: flowchart, sequence, class, state, ER, gantt, pie, etc.
- Keep diagrams clear and well-organized
- Use meaningful node names and labels
- Add proper connections with clear labels where appropriate

SUPPORTED DIAGRAM TYPES:
- flowchart/graph (TD, LR, TB, RL) - for flow diagrams
- sequenceDiagram - for interactions between participants
- classDiagram - for class structures and relationships
- stateDiagram-v2 - for state machines
- erDiagram - for entity relationships
- gantt - for project timelines
- pie - for pie charts
- mindmap - for mind maps

${existingDiagram ? `\nCURRENT DIAGRAM TO MODIFY:\n\`\`\`\n${existingDiagram}\n\`\`\`\n\nModify the above diagram based on the user's request. Keep existing structure where possible.` : "Create a new diagram from scratch based on the user's description."}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        ...this.buildCompletionParams(model, 4096, 0.7),
      });

      let content = completion.choices[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error('Empty diagram content returned');
      }

      // Clean up the response - remove markdown code blocks if present
      content = content.trim();
      if (content.startsWith('```mermaid')) {
        content = content.slice(10);
      } else if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }

      return { success: true, data: content.trim() };
    } catch (error) {
      console.error('[OpenAIService] generateMermaidDiagram error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate diagram',
          code: 'DIAGRAM_GENERATION_FAILED',
        },
      };
    }
  }
}
