const IDEXAL_PROCESS_PREFIX = "idexal";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinIdexalProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [IDEXAL_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatIdexalMainProcessName(): string {
  return joinIdexalProcessName("main");
}

export function formatIdexalGpuProcessName(): string {
  return joinIdexalProcessName("gpu");
}

export function formatIdexalHostProcessName(label?: string): string {
  return joinIdexalProcessName("host", label);
}

export function formatIdexalRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "Idexal") {
    return joinIdexalProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinIdexalProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "Idexal - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinIdexalProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinIdexalProcessName("renderer", normalizedTitle);
}

export function formatIdexalAgentProcessName(provider: string, workspacePath?: string): string {
  return joinIdexalProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatIdexalUtilityProcessName(name?: string, type = "utility"): string {
  return joinIdexalProcessName(type, name);
}
