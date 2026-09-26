import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { IdexalProvider } from "./idexal-task-types-core.js";

export const IDEXAL_AGENT_PROVIDER = "glm" satisfies IdexalProvider;
export const IDEXAL_AGENT_PROVIDER_LABEL = "Idexal Agent";
export const IDEXAL_COMMAND_AGENT_SOURCE = "idexalAgent" satisfies CommandAgentSource;

export const idexalAgentProviderSchema = z.literal(IDEXAL_AGENT_PROVIDER);

export const IDEXAL_COMMAND_AGENT_SOURCES = [
  IDEXAL_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToIdexalAgent(
  _provider?: IdexalProvider | null,
): IdexalProvider {
  return IDEXAL_AGENT_PROVIDER;
}

export function isIdexalAgentProvider(
  provider: IdexalProvider | null | undefined,
): provider is typeof IDEXAL_AGENT_PROVIDER {
  return provider === IDEXAL_AGENT_PROVIDER;
}
