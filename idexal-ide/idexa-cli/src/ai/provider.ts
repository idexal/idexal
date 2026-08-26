import type OpenAI from 'openai';
import axios, { AxiosInstance } from 'axios';
import { ConfigManager } from '../config/manager';

type OpenAIStatic = typeof import('openai').default;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProviderConfig {
  type: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class AIProvider {
  private openai: any = null;
  private httpClient: AxiosInstance | null = null;
  private config: ConfigManager;

  constructor(config: ConfigManager) {
    this.config = config;
    this.initializeProvider();
  }

  private async getOpenAI(): Promise<any> {
    if (this.openai) return this.openai;
    const { default: OpenAI } = await import('openai');
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    this.openai = new OpenAI({
      apiKey: providerConfig.apiKey || process.env.OPENAI_API_KEY,
      baseURL: providerConfig.baseUrl,
    });
    return this.openai;
  }

  private initializeProvider(): void {
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    
    switch (providerConfig.type) {
      case 'openai':
        // OpenAI is lazily initialized via getOpenAI()
        break;
      
      case 'anthropic':
        this.httpClient = axios.create({
          baseURL: providerConfig.baseUrl || 'https://api.anthropic.com',
          headers: {
            'x-api-key': providerConfig.apiKey || process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        });
        break;
      
      case 'local':
        this.httpClient = axios.create({
          baseURL: providerConfig.baseUrl || 'http://localhost:11434',
          headers: { 'content-type': 'application/json' }
        });
        break;
      
      case 'custom':
        this.httpClient = axios.create({
          baseURL: providerConfig.baseUrl,
          headers: {
            'Authorization': `Bearer ${providerConfig.apiKey}`,
            'content-type': 'application/json'
          }
        });
        break;
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    options: ChatOptions = {}
  ): Promise<string> {
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    
    switch (providerConfig.type) {
      case 'openai':
        return this.chatOpenAI(messages, systemPrompt, model, options);
      
      case 'anthropic':
        return this.chatAnthropic(messages, systemPrompt, model, options);
      
      case 'local':
        return this.chatLocal(messages, systemPrompt, model, options);
      
      case 'custom':
        return this.chatCustom(messages, systemPrompt, model, options);
      
      default:
        throw new Error(`Unsupported provider: ${providerConfig.type}`);
    }
  }

  async streamChat(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    options: ChatOptions = {}
  ): Promise<void> {
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    
    switch (providerConfig.type) {
      case 'openai':
        return this.streamOpenAI(messages, systemPrompt, model, onChunk, options);
      
      case 'anthropic':
        return this.streamAnthropic(messages, systemPrompt, model, onChunk, options);
      
      default:
        const response = await this.chat(messages, systemPrompt, model, options);
        onChunk(response);
    }
  }

  private async chatOpenAI(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    options: ChatOptions
  ): Promise<string> {
    const openai = await this.getOpenAI();

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096
    });

    return response.choices[0]?.message?.content || '';
  }

  private async streamOpenAI(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    options: ChatOptions
  ): Promise<void> {
    const openai = await this.getOpenAI();

    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }

  private async chatAnthropic(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    options: ChatOptions
  ): Promise<string> {
    if (!this.httpClient) throw new Error('Anthropic not configured');

    const response = await this.httpClient.post('/v1/messages', {
      model: model,
      max_tokens: options.maxTokens || 4096,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    });

    return response.data.content[0]?.text || '';
  }

  private async streamAnthropic(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    options: ChatOptions
  ): Promise<void> {
    if (!this.httpClient) throw new Error('Anthropic not configured');

    const response = await this.httpClient.post('/v1/messages', {
      model: model,
      max_tokens: options.maxTokens || 4096,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      })),
      stream: true
    }, {
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      let buffer = '';
      
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta') {
                onChunk(data.delta.text);
              }
            } catch {}
          }
        }
      });
      
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  }

  private async chatLocal(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    options: ChatOptions
  ): Promise<string> {
    if (!this.httpClient) throw new Error('Local provider not configured');

    const response = await this.httpClient.post('/api/chat', {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 4096
      }
    });

    return response.data.message?.content || '';
  }

  private async chatCustom(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    options: ChatOptions
  ): Promise<string> {
    if (!this.httpClient) throw new Error('Custom provider not configured');

    const response = await this.httpClient.post('/v1/chat/completions', {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096
    });

    return response.data.choices[0]?.message?.content || '';
  }

  // ── Tool Use ───────────────────────────────────────────

  async chatWithTools(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    tools: any[],
    options: ChatOptions = {}
  ): Promise<{ text: string; toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> | null }> {
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    
    switch (providerConfig.type) {
      case 'openai':
        return this.chatOpenAITools(messages, systemPrompt, model, tools, options);
      case 'anthropic':
        return this.chatAnthropicTools(messages, systemPrompt, model, tools, options);
      default:
        // Fallback: no tool support, just chat
        const text = await this.chat(messages, systemPrompt, model, options);
        return { text, toolCalls: null };
    }
  }

  private async chatOpenAITools(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    tools: any[],
    options: ChatOptions
  ): Promise<{ text: string; toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> | null }> {
    const openai = await this.getOpenAI();

    const formattedTools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      }
    }));

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        }))
      ],
      tools: formattedTools.length > 0 ? formattedTools : undefined,
      tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 8192,
    });

    const message = response.choices[0]?.message;
    const text = message?.content || '';

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      }));
      return { text, toolCalls };
    }

    return { text, toolCalls: null };
  }

  private async chatAnthropicTools(
    messages: ChatMessage[],
    systemPrompt: string,
    model: string,
    tools: any[],
    options: ChatOptions
  ): Promise<{ text: string; toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> | null }> {
    if (!this.httpClient) throw new Error('Anthropic not configured');

    const formattedTools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }],
          };
        }
        if (m.tool_calls) {
          const content: any[] = [];
          if (m.content) content.push({ type: 'text', text: m.content });
          for (const tc of m.tool_calls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            });
          }
          return { role: 'assistant' as const, content };
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      });

    const response = await this.httpClient.post('/v1/messages', {
      model,
      max_tokens: options.maxTokens || 8192,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: formattedTools.length > 0 ? formattedTools : undefined,
    });

    const blocks = response.data.content || [];
    let text = '';
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

    for (const block of blocks) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input || {},
        });
      }
    }

    return { text, toolCalls: toolCalls.length > 0 ? toolCalls : null };
  }

  async listModels(): Promise<string[]> {
    const providerConfig = this.config.get('aiProvider') || { type: 'openai' };
    
    switch (providerConfig.type) {
      case 'openai': {
        const openai = await this.getOpenAI();
        const models = await openai.models.list();
        return models.data.map((m: any) => m.id).filter((m: string) => m.includes('gpt') || m.includes('o1'));
      }
      case 'local': {
        if (!this.httpClient) return [];
        try {
          const response = await this.httpClient.get('/api/tags');
          return response.data.models?.map((m: any) => m.name) || [];
        } catch {
          return [];
        }
      }
      default:
        return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
  }
}
