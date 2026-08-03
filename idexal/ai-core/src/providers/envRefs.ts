// Idexal AI Core — environment variable references
// Shared helpers for `${VAR}` / `$VAR` references inside provider config
// strings (baseUrl, header values, extraBody string values). The wizard
// accepts these references and warns about unset variables before saving;
// the provider factory expands them at construction time so the effective
// value is resolved from the environment (or a provided extras map).

/** Expand ${VAR} / $VAR references inside a string using env + provided vars. */
export function expandEnv(s: string, extra: Record<string, string> = {}): string {
	return s.replace(/\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/g, (m, a, b) => {
		const key = a ?? b;
		return extra[key] ?? process.env[key] ?? m;
	});
}

/** Expand env refs in every header VALUE (names are never touched). */
export function expandEnvHeaders(headers: Record<string, string>, extra: Record<string, string> = {}): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(headers)) {
		out[k] = expandEnv(v, extra);
	}
	return out;
}

/** Names of the ${VAR} / $VAR references present in a string (deduped, in
 * order of first appearance). */
export function extractEnvRefs(s: string): string[] {
	const out: string[] = [];
	s.replace(/\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/g, (_m, a, b) => {
		out.push(a ?? b);
		return _m;
	});
	return [...new Set(out)];
}

/** Env refs in a string that are NOT set in process.env (or `extra`). */
export function missingEnvRefs(s: string, extra: Record<string, string> = {}): string[] {
	return extractEnvRefs(s).filter((k) => !(k in process.env) && !(k in extra));
}

/** Recursively expand env refs in every string value of a JSON-ish value
 * (extraBody payloads are arbitrary JSON — walk objects and arrays). */
export function expandEnvDeep(value: unknown, extra: Record<string, string> = {}): unknown {
	if (typeof value === 'string') return expandEnv(value, extra);
	if (Array.isArray(value)) return value.map((v) => expandEnvDeep(v, extra));
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = expandEnvDeep(v, extra);
		}
		return out;
	}
	return value;
}

/** Env refs anywhere in a JSON-ish value that are NOT set (deep variant of
 * `missingEnvRefs` for extraBody payloads). */
export function missingEnvRefsDeep(value: unknown, extra: Record<string, string> = {}): string[] {
	const refs = new Set<string>();
	const walk = (v: unknown): void => {
		if (typeof v === 'string') {
			for (const r of extractEnvRefs(v)) refs.add(r);
		} else if (Array.isArray(v)) {
			for (const item of v) walk(item);
		} else if (v && typeof v === 'object') {
			for (const item of Object.values(v)) walk(item);
		}
	};
	walk(value);
	return [...refs].filter((k) => !(k in process.env) && !(k in extra));
}
