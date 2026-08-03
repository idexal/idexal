// Idexal AI Core — configuration
// Loads provider and agent configuration from ~/.idexal/config.json,
// idexal.config.json in the workspace, and environment variables.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type ProviderConfig, buildRegistry, type ProviderType } from './providers/factory.ts';
import { ProviderRegistry } from './providers/registry.ts';
import { isLocalUrl } from './providers/types.ts';

export interface AgentConfig {
	/** How many planner→executor→reviewer iterations max. */
	maxIterations: number;
	/** Max sub-agents spawned in parallel. */
	maxParallelAgents: number;
	/** Enables reviewer step after each iteration. */
	useReviewer: boolean;
	/** Maximum tool calls per agent turn before forcing a summary. */
	maxToolCallsPerTurn: number;
	/** Enables long-term memory. */
	memoryEnabled: boolean;
	/** Memory database path. */
	memoryDbPath: string;
	/** Default temperature. */
	temperature: number;
	/** Default max output tokens. */
	maxTokens: number;
	/** System prompt additions. */
	extraSystemPrompt: string;
	/** Enables semantic memory recall via a provider's embeddings endpoint
	 * (falls back to lexical recall when no provider supports embeddings). */
	semanticMemory: boolean;
	/** Provider id used for embeddings (defaults to a local provider such as
	 * Ollama when available, else the first provider that supports them). */
	embeddingProvider?: string;
	/** Embedding model name (e.g. "nomic-embed-text" for Ollama). Defaults
	 * to the provider's embeddingModel, then its default model. */
	embeddingModel?: string;
	/** Enables per-call usage & cost tracking (SQLite at usageDbPath). */
	usageEnabled: boolean;
	/** Usage database path (per-call tokens, latency, cost records). */
	usageDbPath: string;
}

/** Claude Code compatibility settings (read-only interop, never writes there). */
export interface CompatConfig {
	/** Read .claude/settings.json (env keys, model alias), CLAUDE.md
	 * instructions, and .claude/agents/*.md subagents. */
	claudeCode: boolean;
}

export interface IdexalConfig {
	providers: ProviderConfig[];
	agent: AgentConfig;
	/** Preferred provider id used for planning/execution; falls back through the rest. */
	primaryProvider?: string;
	/** Extra environment variables to load from .env style file. */
	envFile?: string;
	/** Idexal Cloud Provider — free freemium gateway at idexal.com. */
	cloud: CloudConfig;
	/** Interop with other agent tools (Claude Code). */
	compat: CompatConfig;
}

/**
 * Idexal Cloud Provider configuration. The gateway is an OpenAI-compatible
 * endpoint the core connects to by default with zero setup, so the agent
 * works out of the box. Users may disable it, point it elsewhere, or attach
 * a free API key (IDEXAL_CLOUD_KEY) to raise quotas. See
 * `idexal/cloud-provider/DESIGN.md` for the full spec.
 */
export interface CloudConfig {
	/** Whether the built-in cloud provider is registered at all. */
	enabled: boolean;
	/** OpenAI-compatible base URL of the gateway. */
	baseUrl: string;
	/** Environment variable holding the optional free key. */
	apiKeyEnv: string;
	/** Default model the gateway routes. */
	model: string;
	/** Registry priority (lower = tried first). `0` (the default) is
	 * automatic: the gateway leads when nothing else is usable, and drops
	 * behind user providers that have keys/local endpoints. Set an explicit
	 * value to force a fixed position. */
	priority: number;
	/** Request timeout for gateway calls (ms) — gateways can be slower. */
	timeoutMs: number;
}

/** Provider id registered for the cloud gateway. */
export const CLOUD_PROVIDER_ID = 'idexal-cloud';

export const DEFAULT_CLOUD: CloudConfig = {
	enabled: true,
	baseUrl: 'https://api.idexal.com/v1',
	apiKeyEnv: 'IDEXAL_CLOUD_KEY',
	model: 'idexal-1',
	priority: 0,
	timeoutMs: 120_000,
};

export const DEFAULT_COMPAT: CompatConfig = {
	claudeCode: true,
};

export const DEFAULT_AGENT: AgentConfig = {
	maxIterations: 5,
	maxParallelAgents: 3,
	useReviewer: true,
	maxToolCallsPerTurn: 12,
	memoryEnabled: true,
	memoryDbPath: '~/.idexal/memory.db',
	temperature: 0.2,
	maxTokens: 8192,
	extraSystemPrompt: '',
	semanticMemory: true,
	embeddingModel: '',
	usageEnabled: true,
	usageDbPath: '~/.idexal/usage.db',
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
	{
		id: 'anthropic',
		displayName: 'Anthropic Claude',
		type: 'anthropic',
		model: 'claude-sonnet-4-20250514',
		apiKeyEnv: 'ANTHROPIC_API_KEY',
		priority: 1,
	},
	{
		id: 'openai',
		displayName: 'OpenAI',
		type: 'openai',
		model: 'gpt-4o',
		apiKeyEnv: 'OPENAI_API_KEY',
		priority: 2,
	},
	{
		id: 'ollama',
		displayName: 'Ollama (Local)',
		type: 'openai-compatible',
		baseUrl: 'http://localhost:11434/v1',
		model: 'llama3.1',
		priority: 3,
	},
];

const CONFIG_CANDIDATES = [
	() => getGlobalConfigPath(),
	() => path.join(process.cwd(), 'idexal.config.json'),
	() => path.join(process.cwd(), '.idexal', 'config.json'),
];

/**
 * Absolute path of the global config file (`~/.idexal/config.json`, or
 * `$IDEXAL_CONFIG_DIR/config.json` when set — useful for tests and
 * portable setups). The `add-provider` wizard writes here.
 */
export function getGlobalConfigPath(): string {
	const dir = process.env.IDEXAL_CONFIG_DIR;
	if (dir) return path.join(dir, 'config.json');
	return path.join(os.homedir(), '.idexal', 'config.json');
}

/**
 * Add or replace a provider in a config file on disk, preserving every
 * other section (agent, cloud, primaryProvider, …). Existing entries with
 * the same id are replaced in place (order kept stable); new entries are
 * appended. Returns the resulting provider list.
 *
 * Throws when the existing file is unreadable/invalid JSON so the caller
 * can abort instead of silently wiping the user's configuration.
 */
/**
 * Read a config file into a partial config, creating an empty one when the
 * file does not exist yet. Throws on invalid JSON so callers can abort
 * instead of silently wiping the user's configuration.
 */
function readConfigFile(configPath: string): Partial<IdexalConfig> {
	if (!fs.existsSync(configPath)) return {};
	const raw = fs.readFileSync(configPath, 'utf8');
	try {
		return JSON.parse(raw) as Partial<IdexalConfig>;
	} catch {
		throw new Error(
			`${configPath} is not valid JSON — fix it or delete it first, then run the command again.`,
		);
	}
}

/** Write a partial config to disk, creating parent directories. */
function writeConfigFile(configPath: string, cfg: Partial<IdexalConfig>): void {
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
}

/**
 * Add or replace a provider in a config file on disk, preserving every
 * other section (agent, cloud, primaryProvider, …). Existing entries with
 * the same id are replaced in place (order kept stable); new entries are
 * appended. Returns the resulting provider list.
 *
 * Throws when the existing file is unreadable/invalid JSON so the caller
 * can abort instead of silently wiping the user's configuration.
 */
export function writeProviderToConfig(configPath: string, provider: ProviderConfig): ProviderConfig[] {
	const existing = readConfigFile(configPath);
	// Guard against a malformed `providers` value (object/string): treat it
	// as an empty list rather than spreading something that isn't an array.
	const providers = Array.isArray(existing.providers) ? [...existing.providers] : [];
	const idx = providers.findIndex((p) => p.id === provider.id);
	if (idx >= 0) {
		providers[idx] = provider;
	} else {
		providers.push(provider);
	}

	writeConfigFile(configPath, { ...existing, providers });
	return providers;
}


/**
 * Remove a provider by id from a config file on disk, preserving every
 * other section (agent, cloud, primaryProvider, …). Returns `true` when
 * an entry was removed, `false` when no provider with that id existed.
 *
 * Throws when the existing file is unreadable/invalid JSON so the caller
 * can abort instead of silently wiping the user's configuration.
 */
export function removeProviderFromConfig(configPath: string, providerId: string): boolean {
	const existing = readConfigFile(configPath);
	// Guard against a malformed `providers` value (object/string): treat it
	// as an empty list rather than spreading something that isn't an array.
	const providers = Array.isArray(existing.providers) ? [...existing.providers] : [];
	const idx = providers.findIndex((p) => p.id === providerId);
	if (idx < 0) {
		return false;
	}
	providers.splice(idx, 1);

	writeConfigFile(configPath, { ...existing, providers });
	return true;
}

export function expandHome(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
	return p;
}

import { expandEnv } from './providers/envRefs.ts';
/** Expand ${VAR} / $VAR references inside a string using env + provided vars. */
export { expandEnv };

export function loadConfig(overrides?: Partial<IdexalConfig>): IdexalConfig {
	// Load .env file if specified
	const envExtra: Record<string, string> = {};

	let base: IdexalConfig = {
		// Caller-provided provider lists replace the defaults entirely
		// (config files below still merge by id on top of this base).
		providers: overrides?.providers?.length ? overrides.providers : DEFAULT_PROVIDERS,
		agent: DEFAULT_AGENT,
		primaryProvider: overrides?.primaryProvider,
		envFile: overrides?.envFile,
		cloud: { ...DEFAULT_CLOUD, ...overrides?.cloud },
		compat: { ...DEFAULT_COMPAT, ...overrides?.compat },
	};

	// Global config (~/.idexal/config.json) then workspace configs. The first
	// config file that declares providers REPLACES the defaults entirely (the
	// user's own provider list is authoritative — otherwise defaults like the
	// local ollama entry would silently linger and get picked by fallback).
	// Later config files merge by id on top, so a workspace config can tweak
	// or extend a global one. Agent/cloud fields merge shallowly each file.
	//
	// NOTE: because files are authoritative, any config file that declares
	// providers also replaces a caller-provided `overrides.providers` list
	// (files win over programmatic defaults). Callers that must force their
	// own list should pass it AND ensure no declaring config file exists,
	// or edit the file itself.
	let configDeclaredProviders = false;
	for (const getPath of CONFIG_CANDIDATES) {
		const p = getPath();
		if (!fs.existsSync(p)) continue;
		try {
			const raw = fs.readFileSync(p, 'utf8');
			const parsed = JSON.parse(raw) as Partial<IdexalConfig>;
			if (parsed.providers?.length) {
				if (!configDeclaredProviders) {
					// First declaration replaces the default provider set.
					base = { ...base, providers: parsed.providers };
					configDeclaredProviders = true;
				} else {
					base = {
						...base,
						providers: mergeProviders(base.providers, parsed.providers),
					};
				}
			}
			if (parsed.agent) {
				base = { ...base, agent: { ...base.agent, ...parsed.agent } };
			}
			if (parsed.cloud) {
				base = { ...base, cloud: { ...base.cloud, ...parsed.cloud } };
			}
			if (parsed.primaryProvider !== undefined) base.primaryProvider = parsed.primaryProvider;
			if (parsed.envFile !== undefined) base.envFile = parsed.envFile;
			if (parsed.compat) {
				base = { ...base, compat: { ...base.compat, ...parsed.compat } };
			}
		} catch (err) {
			console.warn(`[idexal] Could not read config ${p}: ${String(err)}`);
		}
	}

	// Expand env references now that all config is merged
	const cloud: CloudConfig = {
		...base.cloud,
		baseUrl: expandEnv(base.cloud.baseUrl, envExtra),
		apiKeyEnv: expandEnv(base.cloud.apiKeyEnv, envExtra),
		model: expandEnv(base.cloud.model, envExtra),
	};

	// Apply the cloud provider: remove it when disabled; otherwise ensure a
	// single `idexal-cloud` entry with the effective settings exists.
	const providers = applyCloudProvider(base.providers, cloud);

	return {
		providers,
		agent: base.agent,
		primaryProvider: base.primaryProvider,
		envFile: base.envFile,
		cloud,
		compat: base.compat,
	};
}

/**
 * Merge the cloud provider into the provider list.
 * - disabled → strip any `idexal-cloud` entry.
 * - enabled → replace existing `idexal-cloud` entries with one carrying the
 *   effective cloud settings (baseUrl / model / apiKeyEnv / priority).
 * User-provided providers are never touched.
 */
function applyCloudProvider(providers: ProviderConfig[], cloud: CloudConfig): ProviderConfig[] {
	const others = providers.filter((p) => p.id !== CLOUD_PROVIDER_ID);
	if (!cloud.enabled) {
		return others;
	}
	const entry: ProviderConfig = {
		id: CLOUD_PROVIDER_ID,
		displayName: 'Idexal Cloud (free)',
		type: 'openai-compatible',
		baseUrl: cloud.baseUrl,
		model: cloud.model,
		apiKeyEnv: cloud.apiKeyEnv,
		// The built-in gateway is anonymous-friendly: it never requires a key.
		anonymous: true,
		priority: cloud.priority,
		timeoutMs: cloud.timeoutMs,
	};
	// Automatic priority (cloud.priority === 0): lead when nothing else is
	// usable; otherwise sit behind the user's usable providers so their own
	// keys/local models are tried first (no regression for existing setups).
	if (entry.priority === 0) {
		const maxUsable = Math.max(0, ...others.map((p) => p.priority ?? 0));
		entry.priority = others.some(providerUsable) ? maxUsable + 1 : 0;
	}
	return [...others, entry];
}

/**
 * Whether a provider config can be used without the cloud gateway. Only the
 * provider's *own* key source counts: an explicit apiKey, its apiKeyEnv
 * populated, an anonymous tier, or a local base URL. (Anthropic providers
 * also inherit ANTHROPIC_API_KEY at construction time when no apiKeyEnv is
 * given — mirrored here so a keyed anthropic config still ranks ahead.)
 */
function providerUsable(p: ProviderConfig): boolean {
	if (p.anonymous) return true;
	if (isLocalUrl(p.baseUrl)) return true;
	if (p.apiKey) return true;
	if (p.apiKeyEnv && process.env[p.apiKeyEnv]) return true;
	if (p.type === 'anthropic' && !p.apiKeyEnv && process.env.ANTHROPIC_API_KEY) return true;
	return false;
}

/** Merge provider lists by id; later (workspace) configs replace same-id entries. */
function mergeProviders(
	global: ProviderConfig[],
	local: ProviderConfig[],
): ProviderConfig[] {
	const map = new Map<string, ProviderConfig>();
	for (const p of global) map.set(p.id, p);
	for (const p of local) map.set(p.id, p);
	return [...map.values()];
}

export function registryFromConfig(cfg: IdexalConfig): ProviderRegistry {
	return buildRegistry(cfg.providers);
}

export type { ProviderConfig, ProviderType };
