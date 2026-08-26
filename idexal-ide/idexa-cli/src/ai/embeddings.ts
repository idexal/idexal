/**
 * Local Embedding Service — uses @xenova/transformers to generate
 * sentence embeddings for semantic memory search.
 *
 * Model: all-MiniLM-L6-v2 (22M params, 384 dimensions)
 * - Fast inference on CPU
 * - Good quality for code and text
 * - ~50MB download, cached locally
 */
import path from 'path';
import fs from 'fs';

// Cache directory for the model
const MODEL_CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.idexa', 'models', 'embeddings'
);

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const MAX_SEQ_LENGTH = 256;

// Singleton instance
let pipeline: any = null;
let modelLoaded = false;
let modelLoading = false;
let modelError: string | null = null;

/**
 * Ensure the cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(MODEL_CACHE_DIR)) {
    fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true });
  }
}

/**
 * Load the embedding model (lazy initialization)
 * Downloads on first use, then cached locally
 */
async function loadModel(): Promise<any> {
  if (pipeline) return pipeline;
  if (modelError) throw new Error(modelError);
  if (modelLoading) {
    // Wait for current load to finish
    while (modelLoading && !pipeline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (pipeline) return pipeline;
  }

  modelLoading = true;
  try {
    const { pipeline: loadPipeline } = await import('@xenova/transformers');

    ensureCacheDir();

    // Set cache directory
    process.env.TRANSFORMERS_CACHE = MODEL_CACHE_DIR;

    pipeline = await loadPipeline('feature-extraction', MODEL_NAME, {
      quantized: true, // Use quantized model for smaller size
      progress_callback: undefined, // Silent loading
    });

    modelLoaded = true;
    modelLoading = false;
    return pipeline;
  } catch (error: any) {
    modelError = error.message || 'Failed to load embedding model';
    modelLoading = false;
    throw new Error(modelError);
  }
}

/**
 * Generate embedding for a single text
 */
export async function embed(text: string): Promise<number[]> {
  try {
    const pipe = await loadModel();

    // Truncate text to max sequence length
    const truncated = text.substring(0, MAX_SEQ_LENGTH * 4); // ~4 chars per token

    const output = await pipe(truncated, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data.slice(0, EMBEDDING_DIM)) as number[];
  } catch {
    // Fallback: generate a simple hash-based pseudo-embedding
    return generateHashEmbedding(text);
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    results.push(await embed(text));
  }

  return results;
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Fallback: Generate a deterministic hash-based pseudo-embedding
 * Used when the model fails to load
 */
function generateHashEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  // Simple hash-based embedding using character positions
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const idx = (charCode * 31 + i * 17 + j * 7) % EMBEDDING_DIM;
      embedding[idx] += 1 / (1 + Math.abs(idx - EMBEDDING_DIM / 2));
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

/**
 * Check if the embedding model is available
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Get embedding model status
 */
export function getModelStatus(): { loaded: boolean; model: string; dimensions: number; error: string | null } {
  return {
    loaded: modelLoaded,
    model: MODEL_NAME,
    dimensions: EMBEDDING_DIM,
    error: modelError,
  };
}

/**
 * Pre-warm the model (call on startup)
 */
export async function warmup(): Promise<void> {
  try {
    await embed('warmup');
  } catch {
    // Ignore warmup errors
  }
}
