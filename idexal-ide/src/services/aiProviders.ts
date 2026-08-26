/**
 * AI Providers Service
 * Supports all major AI providers, custom endpoints, model fetching,
 * and per-purpose model assignment (chat, code, completion, etc.)
 */

export type ProviderFamily = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'azure' | 'bedrock' | 'groq' | 'together' | 'perplexity' | 'deepseek' | 'fireworks' | 'ollama' | 'xai' | 'openrouter' | 'replicate' | 'huggingface' | 'stability' | 'midjourney' | 'ideogram' | 'elevenlabs' | 'whisper' | 'deepgram' | 'assemblyai' | 'lmstudio' | 'vllm' | 'custom'

export type ModelPurpose = 'chat' | 'code' | 'completion' | 'embedding' | 'vision' | 'audio' | 'reasoning' | 'translation' | 'summarization'

export interface AIProviderConfig {
  id: string
  name: string
  family: ProviderFamily
  baseUrl: string
  apiKey: string
  enabled: boolean
  isCustom: boolean
  models: AIModel[]
  lastFetched?: Date
  headers?: Record<string, string>
}

export interface AIModel {
  id: string
  name: string
  provider: string
  family: ProviderFamily
  contextLength: number
  maxOutput: number
  supportsStreaming: boolean
  supportsVision: boolean
  supportsFunctionCalling: boolean
  pricing?: { input: number; output: number }
  description?: string
}

export interface ProviderPurposeAssignment {
  purpose: ModelPurpose
  providerId: string
  modelId: string
}

const PROVIDER_FAMILIES: Record<ProviderFamily, { name: string; baseUrl: string; authStyle: 'bearer' | 'x-api-key' | 'custom'; icon: string; color: string }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', authStyle: 'bearer', icon: '🟢', color: 'text-green-400' },
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', authStyle: 'x-api-key', icon: '🟠', color: 'text-orange-400' },
  google: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', authStyle: 'custom', icon: '🔵', color: 'text-blue-400' },
  mistral: { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', authStyle: 'bearer', icon: '🟣', color: 'text-purple-400' },
  cohere: { name: 'Cohere', baseUrl: 'https://api.cohere.ai/v1', authStyle: 'bearer', icon: '🩵', color: 'text-cyan-400' },
  azure: { name: 'Azure OpenAI', baseUrl: 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments', authStyle: 'bearer', icon: '🔷', color: 'text-blue-300' },
  bedrock: { name: 'AWS Bedrock', baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com', authStyle: 'custom', icon: '🟧', color: 'text-amber-400' },
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', authStyle: 'bearer', icon: '⚡', color: 'text-yellow-400' },
  together: { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', authStyle: 'bearer', icon: '🤝', color: 'text-teal-400' },
  perplexity: { name: 'Perplexity', baseUrl: 'https://api.perplexity.ai', authStyle: 'bearer', icon: '🔍', color: 'text-indigo-400' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', authStyle: 'bearer', icon: '🧠', color: 'text-cyan-300' },
  fireworks: { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', authStyle: 'bearer', icon: '🔥', color: 'text-red-400' },
  ollama: { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/api', authStyle: 'bearer', icon: '🦙', color: 'text-gray-400' },
  xai: { name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', authStyle: 'bearer', icon: '✖️', color: 'text-gray-300' },
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', authStyle: 'bearer', icon: '🌐', color: 'text-blue-400' },
  replicate: { name: 'Replicate', baseUrl: 'https://api.replicate.com/v1', authStyle: 'bearer', icon: '🔄', color: 'text-teal-300' },
  huggingface: { name: 'HuggingFace', baseUrl: 'https://api-inference.huggingface.co/models', authStyle: 'bearer', icon: '🤗', color: 'text-yellow-300' },
  lmstudio: { name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', authStyle: 'bearer', icon: '🖥️', color: 'text-indigo-300' },
  vllm: { name: 'vLLM', baseUrl: 'http://localhost:8000/v1', authStyle: 'bearer', icon: '🚀', color: 'text-emerald-400' },
  stability: { name: 'Stability AI', baseUrl: 'https://api.stability.ai/v2beta', authStyle: 'bearer', icon: '🎨', color: 'text-violet-400' },
  midjourney: { name: 'Midjourney', baseUrl: 'https://api.midjourney.com/v1', authStyle: 'bearer', icon: '🖼️', color: 'text-blue-200' },
  ideogram: { name: 'Ideogram', baseUrl: 'https://api.ideogram.ai/v1', authStyle: 'bearer', icon: '✏️', color: 'text-pink-400' },
  elevenlabs: { name: 'ElevenLabs', baseUrl: 'https://api.elevenlabs.io/v1', authStyle: 'bearer', icon: '🎙️', color: 'text-green-300' },
  whisper: { name: 'Whisper (OpenAI)', baseUrl: 'https://api.openai.com/v1', authStyle: 'bearer', icon: '🎤', color: 'text-gray-200' },
  deepgram: { name: 'Deepgram', baseUrl: 'https://api.deepgram.com/v1', authStyle: 'bearer', icon: '🔊', color: 'text-blue-500' },
  assemblyai: { name: 'AssemblyAI', baseUrl: 'https://api.assemblyai.com/v2', authStyle: 'bearer', icon: '🎧', color: 'text-orange-300' },
  custom: { name: 'Custom Provider', baseUrl: '', authStyle: 'bearer', icon: '⚙️', color: 'text-gray-300' },
}

// Pre-configured models for each provider family
const PRESET_MODELS: Record<ProviderFamily, AIModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', family: 'openai', contextLength: 128000, maxOutput: 16384, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 5, output: 15 }, description: 'Most capable model, fastest' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', family: 'openai', contextLength: 128000, maxOutput: 16384, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 0.15, output: 0.6 }, description: 'Fast & affordable' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', family: 'openai', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 10, output: 30 } },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', family: 'openai', contextLength: 8192, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, pricing: { input: 30, output: 60 } },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', family: 'openai', contextLength: 16385, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, pricing: { input: 0.5, output: 1.5 } },
    { id: 'o1-preview', name: 'o1-preview', provider: 'openai', family: 'openai', contextLength: 128000, maxOutput: 32768, supportsStreaming: false, supportsVision: true, supportsFunctionCalling: false, description: 'Reasoning model' },
    { id: 'o1-mini', name: 'o1-mini', provider: 'openai', family: 'openai', contextLength: 128000, maxOutput: 32768, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Fast reasoning model' },
    { id: 'text-embedding-3-large', name: 'Embedding 3 Large', provider: 'openai', family: 'openai', contextLength: 8191, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Best embedding model' },
    { id: 'text-embedding-3-small', name: 'Embedding 3 Small', provider: 'openai', family: 'openai', contextLength: 8191, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Fast embedding model' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', family: 'anthropic', contextLength: 200000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 3, output: 15 }, description: 'Best balance of speed & quality' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', family: 'anthropic', contextLength: 200000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 1, output: 5 }, description: 'Fastest Claude model' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', family: 'anthropic', contextLength: 200000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 15, output: 75 }, description: 'Most powerful Claude' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', family: 'anthropic', contextLength: 200000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 3, output: 15 } },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', family: 'anthropic', contextLength: 200000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 0.25, output: 1.25 }, description: 'Fastest & cheapest' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', family: 'google', contextLength: 1000000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 0.075, output: 0.3 }, description: 'Fastest Gemini' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', family: 'google', contextLength: 2000000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 1.25, output: 5 }, description: 'Best quality Gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', family: 'google', contextLength: 1000000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, pricing: { input: 0.075, output: 0.3 } },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'google', family: 'google', contextLength: 32760, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', family: 'mistral', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Most capable Mistral' },
    { id: 'mistral-medium-latest', name: 'Mistral Medium', provider: 'mistral', family: 'mistral', contextLength: 32000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', family: 'mistral', contextLength: 32000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Fast & efficient' },
    { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', family: 'mistral', contextLength: 32000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Code generation specialist' },
    { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B', provider: 'mistral', family: 'mistral', contextLength: 65536, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'mistral', family: 'mistral', contextLength: 32768, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  cohere: [
    { id: 'command-r-plus', name: 'Command R+', provider: 'cohere', family: 'cohere', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Most capable Cohere' },
    { id: 'command-r', name: 'Command R', provider: 'cohere', family: 'cohere', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'command', name: 'Command', provider: 'cohere', family: 'cohere', contextLength: 4096, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false },
  ],
  azure: [
    { id: 'gpt-4o', name: 'GPT-4o (Azure)', provider: 'azure', family: 'azure', contextLength: 128000, maxOutput: 16384, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (Azure)', provider: 'azure', family: 'azure', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo (Azure)', provider: 'azure', family: 'azure', contextLength: 16385, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  bedrock: [
    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet (Bedrock)', provider: 'bedrock', family: 'bedrock', contextLength: 200000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus (Bedrock)', provider: 'bedrock', family: 'bedrock', contextLength: 200000, maxOutput: 4096, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'meta.llama3-70b-instruct-v1:0', name: 'Llama 3 70B (Bedrock)', provider: 'bedrock', family: 'bedrock', contextLength: 8192, maxOutput: 2048, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false },
    { id: 'amazon.titan-text-express-v1', name: 'Titan Express (Bedrock)', provider: 'bedrock', family: 'bedrock', contextLength: 8192, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false },
  ],
  groq: [
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'groq', family: 'groq', contextLength: 128000, maxOutput: 32768, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Ultra-fast inference' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', family: 'groq', contextLength: 128000, maxOutput: 32768, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Fastest Llama' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', family: 'groq', contextLength: 32768, maxOutput: 32768, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq', family: 'groq', contextLength: 8192, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false },
  ],
  together: [
    { id: 'meta-llama/Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', provider: 'together', family: 'together', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Largest open model' },
    { id: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', provider: 'together', family: 'together', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', provider: 'together', family: 'together', contextLength: 65536, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', provider: 'together', family: 'together', contextLength: 32768, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', provider: 'together', family: 'together', contextLength: 65536, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  perplexity: [
    { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large 128K Online', provider: 'perplexity', family: 'perplexity', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Web-connected model' },
    { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small 128K Online', provider: 'perplexity', family: 'perplexity', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Fast web-connected' },
    { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat', provider: 'perplexity', family: 'perplexity', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', family: 'deepseek', contextLength: 64000, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'General-purpose model' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', family: 'deepseek', contextLength: 128000, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Code generation specialist' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', family: 'deepseek', contextLength: 64000, maxOutput: 8192, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Deep reasoning model' },
  ],
  fireworks: [
    { id: 'accounts/fireworks/models/llama-v3p1-405b-instruct', name: 'Llama 3.1 405B', provider: 'fireworks', family: 'fireworks', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B', provider: 'fireworks', family: 'fireworks', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', provider: 'fireworks', family: 'fireworks', contextLength: 65536, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  ollama: [
    { id: 'llama3.1', name: 'Llama 3.1 8B', provider: 'ollama', family: 'ollama', contextLength: 128000, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Local inference' },
    { id: 'codellama', name: 'CodeLlama', provider: 'ollama', family: 'ollama', contextLength: 16384, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Code generation' },
    { id: 'mistral', name: 'Mistral 7B', provider: 'ollama', family: 'ollama', contextLength: 32768, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'ollama', family: 'ollama', contextLength: 128000, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', provider: 'ollama', family: 'ollama', contextLength: 32768, maxOutput: 8192, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'phi3', name: 'Phi-3', provider: 'ollama', family: 'ollama', contextLength: 128000, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
  ],
  xai: [
    { id: 'grok-2', name: 'Grok 2', provider: 'xai', family: 'xai', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true, description: 'Most capable xAI model' },
    { id: 'grok-2-mini', name: 'Grok 2 Mini', provider: 'xai', family: 'xai', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Fast xAI model' },
    { id: 'grok-beta', name: 'Grok Beta', provider: 'xai', family: 'xai', contextLength: 8192, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Early access model' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', provider: 'openrouter', family: 'openrouter', contextLength: 128000, maxOutput: 16384, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', provider: 'openrouter', family: 'openrouter', contextLength: 200000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (via OpenRouter)', provider: 'openrouter', family: 'openrouter', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash (via OpenRouter)', provider: 'openrouter', family: 'openrouter', contextLength: 1000000, maxOutput: 8192, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
  ],
  replicate: [
    { id: 'meta/meta-llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'replicate', family: 'replicate', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', provider: 'replicate', family: 'replicate', contextLength: 65536, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'stability-ai/sdxl', name: 'SDXL (Image Gen)', provider: 'replicate', family: 'replicate', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Image generation' },
  ],
  huggingface: [
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', provider: 'huggingface', family: 'huggingface', contextLength: 131072, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', provider: 'huggingface', family: 'huggingface', contextLength: 65536, maxOutput: 16384, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
    { id: 'BAAI/bge-large-en-v1.5', name: 'BGE Large (Embedding)', provider: 'huggingface', family: 'huggingface', contextLength: 512, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Embedding model' },
  ],
  lmstudio: [
    { id: 'lmstudio-default', name: 'Local Model', provider: 'lmstudio', family: 'lmstudio', contextLength: 32768, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Auto-detected from LM Studio' },
  ],
  vllm: [
    { id: 'vllm-default', name: 'Local Model', provider: 'vllm', family: 'vllm', contextLength: 32768, maxOutput: 4096, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true, description: 'Auto-detected from vLLM' },
  ],
  stability: [
    { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0', provider: 'stability', family: 'stability', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Image generation' },
    { id: 'stable-diffusion-3-medium', name: 'Stable Diffusion 3', provider: 'stability', family: 'stability', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Latest SD model' },
    { id: 'stable-image-core-v1', name: 'Stable Image Core', provider: 'stability', family: 'stability', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Fast image generation' },
  ],
  midjourney: [
    { id: 'midjourney-v6', name: 'Midjourney v6', provider: 'midjourney', family: 'midjourney', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Highest quality image gen' },
  ],
  ideogram: [
    { id: 'ideogram-v2', name: 'Ideogram v2', provider: 'ideogram', family: 'ideogram', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Text-in-image specialist' },
  ],
  elevenlabs: [
    { id: 'eleven_multilingual_v2', name: 'Multilingual v2', provider: 'elevenlabs', family: 'elevenlabs', contextLength: 0, maxOutput: 0, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Text-to-speech, 29 languages' },
    { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', provider: 'elevenlabs', family: 'elevenlabs', contextLength: 0, maxOutput: 0, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Low-latency TTS' },
    { id: 'eleven_monolingual_v1', name: 'English v1', provider: 'elevenlabs', family: 'elevenlabs', contextLength: 0, maxOutput: 0, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'English-only, fastest' },
  ],
  whisper: [
    { id: 'whisper-1', name: 'Whisper v1', provider: 'whisper', family: 'whisper', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Speech-to-text' },
    { id: 'whisper-large-v3', name: 'Whisper Large v3', provider: 'whisper', family: 'whisper', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Most accurate STT' },
  ],
  deepgram: [
    { id: 'nova-2', name: 'Nova 2', provider: 'deepgram', family: 'deepgram', contextLength: 0, maxOutput: 0, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: false, description: 'Fastest real-time STT' },
    { id: 'nova-2-medical', name: 'Nova 2 Medical', provider: 'deepgram', family: 'deepgram', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Medical transcription' },
  ],
  assemblyai: [
    { id: 'best', name: 'Best Model', provider: 'assemblyai', family: 'assemblyai', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Highest accuracy STT' },
    { id: 'nano', name: 'Nano', provider: 'assemblyai', family: 'assemblyai', contextLength: 0, maxOutput: 0, supportsStreaming: false, supportsVision: false, supportsFunctionCalling: false, description: 'Fastest STT' },
  ],
  custom: [],
}

export const PROVIDER_INFO = PROVIDER_FAMILIES

class AIProviderService {
  private providers: Map<string, AIProviderConfig> = new Map()
  private purposeAssignments: Map<ModelPurpose, { providerId: string; modelId: string }> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromStorage()
    this.initializeDefaultProviders()
  }

  private initializeDefaultProviders() {
    const defaults: Array<{ id: string; family: ProviderFamily; enabled: boolean }> = [
      { id: 'openai', family: 'openai', enabled: true },
      { id: 'anthropic', family: 'anthropic', enabled: true },
      { id: 'google', family: 'google', enabled: false },
      { id: 'mistral', family: 'mistral', enabled: false },
      { id: 'groq', family: 'groq', enabled: false },
      { id: 'deepseek', family: 'deepseek', enabled: false },
      { id: 'ollama', family: 'ollama', enabled: false },
    ]

    defaults.forEach(d => {
      if (!this.providers.has(d.id)) {
        const info = PROVIDER_FAMILIES[d.family]
        this.providers.set(d.id, {
          id: d.id,
          name: info.name,
          family: d.family,
          baseUrl: info.baseUrl,
          apiKey: '',
          enabled: d.enabled,
          isCustom: false,
          models: [...PRESET_MODELS[d.family]],
        })
      }
    })

    // Pre-configure custom AI gateway with hundreds of models
    if (!this.providers.has('custom-gateway')) {
      this.providers.set('custom-gateway', {
        id: 'custom-gateway',
        name: 'AI Gateway',
        family: 'custom',
        baseUrl: 'http://localhost:20128/v1',
        apiKey: '',
        enabled: true,
        isCustom: true,
        models: [
          { id: 'auto/best-coding', name: 'Best Coding', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/best-reasoning', name: 'Best Reasoning', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/best-fast', name: 'Best Fast', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/best-chat', name: 'Best Chat', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/best-vision', name: 'Best Vision', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
          { id: 'auto/pro-coding', name: 'Pro Coding', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/pro-reasoning', name: 'Pro Reasoning', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/pro-chat', name: 'Pro Chat', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/coding', name: 'Auto Coding', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/fast', name: 'Auto Fast', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/chat', name: 'Auto Chat', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/claude-opus', name: 'Claude Opus (Auto)', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
          { id: 'auto/claude-sonnet', name: 'Claude Sonnet (Auto)', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
          { id: 'auto/gemini', name: 'Gemini (Auto)', provider: 'custom-gateway', family: 'custom', contextLength: 1048576, maxOutput: 65536, supportsStreaming: true, supportsVision: true, supportsFunctionCalling: true },
          { id: 'auto/reasoning', name: 'Auto Reasoning', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/smart', name: 'Auto Smart', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
          { id: 'auto/cheap', name: 'Auto Cheap', provider: 'custom-gateway', family: 'custom', contextLength: 2000000, maxOutput: 2000000, supportsStreaming: true, supportsVision: false, supportsFunctionCalling: true },
        ],
        headers: { 'Authorization': 'Bearer ' + (this.getProvider('custom-gateway')?.apiKey || '') },
      })
      // Trigger model fetch in background
      this.fetchModels('custom-gateway').catch(() => {})
    }

    this.saveToStorage()
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('idexal-ai-providers')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.providers) {
          for (const [id, config] of Object.entries(data.providers)) {
            this.providers.set(id, config as AIProviderConfig)
          }
        }
        if (data.purposeAssignments) {
          for (const [purpose, assignment] of Object.entries(data.purposeAssignments)) {
            this.purposeAssignments.set(purpose as ModelPurpose, assignment as { providerId: string; modelId: string })
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  saveToStorage() {
    const data = {
      providers: Object.fromEntries(this.providers),
      purposeAssignments: Object.fromEntries(this.purposeAssignments),
    }
    localStorage.setItem('idexal-ai-providers', JSON.stringify(data))
    this.notifyListeners()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notifyListeners() {
    this.listeners.forEach(l => l())
  }

  // Provider CRUD
  getAllProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values())
  }

  getEnabledProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values()).filter(p => p.enabled)
  }

  getProvider(id: string): AIProviderConfig | undefined {
    return this.providers.get(id)
  }

  updateProvider(id: string, updates: Partial<AIProviderConfig>) {
    const provider = this.providers.get(id)
    if (provider) {
      this.providers.set(id, { ...provider, ...updates })
      this.saveToStorage()
    }
  }

  addCustomProvider(name: string, baseUrl: string, apiKey: string, authStyle: string = 'bearer'): string {
    const id = `custom-${Date.now()}`
    const headers: Record<string, string> = {}
    if (authStyle === 'bearer' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (authStyle === 'x-api-key' && apiKey) {
      headers['x-api-key'] = apiKey
    } else if (authStyle === 'custom' && apiKey) {
      headers['Authorization'] = apiKey
    }
    
    const provider: AIProviderConfig = {
      id,
      name,
      family: 'custom',
      baseUrl,
      apiKey,
      enabled: true,
      isCustom: true,
      models: [],
      headers,
    }
    this.providers.set(id, provider)
    this.saveToStorage()
    
    // Auto-fetch models for the new provider
    if (baseUrl && apiKey) {
      this.fetchModels(id).catch(() => {})
    }
    
    return id
  }

  removeProvider(id: string) {
    this.providers.delete(id)
    this.saveToStorage()
  }

  toggleProvider(id: string) {
    const provider = this.providers.get(id)
    if (provider) {
      provider.enabled = !provider.enabled
      this.saveToStorage()
      
      // Auto-fetch models when enabling a provider with API key
      if (provider.enabled && provider.apiKey && provider.models.length === 0) {
        this.fetchModels(id).catch(() => {})
      }
    }
  }

  // Model fetching
  async fetchModels(providerId: string): Promise<AIModel[]> {
    const provider = this.providers.get(providerId)
    if (!provider) throw new Error('Provider not found')

    try {
      let models: AIModel[] = []

      if (provider.family === 'ollama') {
        models = await this.fetchOllamaModels(provider)
      } else if (provider.family === 'google') {
        models = await this.fetchGoogleModels(provider)
      } else {
        models = await this.fetchOpenAICompatibleModels(provider)
      }

      provider.models = models
      provider.lastFetched = new Date()
      this.saveToStorage()
      return models
    } catch (error) {
      console.error(`Failed to fetch models for ${provider.name}:`, error)
      // Fall back to preset models if available
      if (provider.family in PRESET_MODELS && PRESET_MODELS[provider.family].length > 0) {
        provider.models = [...PRESET_MODELS[provider.family]]
        this.saveToStorage()
        return PRESET_MODELS[provider.family]
      }
      throw error
    }
  }

  async fetchAllEnabledModels(): Promise<void> {
    const enabled = this.getEnabledProviders()
    const promises = enabled
      .filter(p => p.apiKey || p.family === 'ollama')
      .map(p => this.fetchModels(p.id).catch(() => {}))
    await Promise.allSettled(promises)
  }

  private async fetchOpenAICompatibleModels(provider: AIProviderConfig): Promise<AIModel[]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (provider.family === 'anthropic') {
      headers['x-api-key'] = provider.apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`
    }

    const response = await fetch(`${provider.baseUrl}/models`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    const models: AIModel[] = (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: provider.id,
      family: provider.family,
      contextLength: m.context_length || 4096,
      maxOutput: m.max_output_tokens || 4096,
      supportsStreaming: true,
      supportsVision: m.id.includes('vision') || m.id.includes('gpt-4o') || m.id.includes('claude-3'),
      supportsFunctionCalling: !m.id.includes('embedding') && !m.id.includes('mini'),
      description: m.description || '',
    }))

    return models
  }

  private async fetchOllamaModels(provider: AIProviderConfig): Promise<AIModel[]> {
    const baseUrl = provider.baseUrl || 'http://localhost:11434'
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    return (data.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      provider: 'ollama',
      family: 'ollama' as ProviderFamily,
      contextLength: 4096,
      maxOutput: 4096,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      description: m.details?.parameter_size || '',
    }))
  }

  private async fetchGoogleModels(provider: AIProviderConfig): Promise<AIModel[]> {
    if (!provider.apiKey) throw new Error('API key required for Google')
    const response = await fetch(`${provider.baseUrl}/models?key=${provider.apiKey}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    return (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
        provider: 'google',
        family: 'google' as ProviderFamily,
        contextLength: m.inputTokenLimit || 32768,
        maxOutput: m.outputTokenLimit || 8192,
        supportsStreaming: true,
        supportsVision: m.name.includes('vision') || m.name.includes('1.5'),
        supportsFunctionCalling: true,
        description: m.description || '',
      }))
  }

  // Purpose assignment
  assignModel(purpose: ModelPurpose, providerId: string, modelId: string) {
    this.purposeAssignments.set(purpose, { providerId, modelId })
    this.saveToStorage()
  }

  getModelForPurpose(purpose: ModelPurpose): { provider: AIProviderConfig; model: AIModel } | null {
    const assignment = this.purposeAssignments.get(purpose)
    if (!assignment) {
      // Fallback: find first enabled provider with a suitable model
      const enabled = this.getEnabledProviders()
      for (const provider of enabled) {
        const model = provider.models[0]
        if (model) return { provider, model }
      }
      return null
    }

    const provider = this.providers.get(assignment.providerId)
    if (!provider) return null
    const model = provider.models.find(m => m.id === assignment.modelId)
    if (!model) return null
    return { provider, model }
  }

  getAllPurposeAssignments(): Map<ModelPurpose, { providerId: string; modelId: string }> {
    return new Map(this.purposeAssignments)
  }

  getPurposeLabels(): Record<ModelPurpose, { label: string; description: string; icon: string }> {
    return {
      chat: { label: 'Chat & General', description: 'General conversation and Q&A', icon: '💬' },
      code: { label: 'Code Generation', description: 'Writing and completing code', icon: '💻' },
      completion: { label: 'Code Completion', description: 'Inline code suggestions', icon: '⚡' },
      embedding: { label: 'Embeddings', description: 'Text embeddings for search', icon: '🔢' },
      vision: { label: 'Vision & Multimodal', description: 'Image understanding and analysis', icon: '👁️' },
      audio: { label: 'Audio & Speech', description: 'Speech-to-text and text-to-speech', icon: '🎤' },
      reasoning: { label: 'Reasoning & Analysis', description: 'Complex reasoning and logical analysis', icon: '🧩' },
      translation: { label: 'Translation', description: 'Multi-language translation', icon: '🌍' },
      summarization: { label: 'Summarization', description: 'Text summarization and extraction', icon: '📝' },
    }
  }
}

export const aiProviderService = new AIProviderService()
export default aiProviderService
