#!/usr/bin/env node
// Idexal Cloud Gateway — doctor: quick local diagnostics
// Checks the environment the gateway needs: Node version, upstream
// reachability, registered keys, and quota DB writability. Safe, offline,
// and never prints keys.

import { loadConfig, describeConfig, upstreamKey, upstreamUsable } from './config.ts';
import { getModel } from './models.ts';

const config = loadConfig();

console.log('\n  Idexal Cloud Gateway — doctor\n');

// 1. Node version
const major = Number(process.versions.node.split('.')[0]);
console.log(`  Node:        ${process.version} ${major >= 22 ? '✓' : '✗ (need >= 22 for node:sqlite + type stripping)'}`);

// 2. Upstreams
console.log('\n  Upstreams:');
if (config.upstreams.length === 0) {
	console.log('    — none configured (set IDEXAL_GATEWAY_UPSTREAMS)');
} else {
	for (const u of config.upstreams) {
		const usable = upstreamUsable(u);
		const key = upstreamKey(u);
		console.log(
			`    • ${u.id} (${u.kind}) ${u.baseUrl} — ${usable ? '✓ usable' : '✗ unusable'}${key ? ' · key ✓' : ' · keyless'} · models: ${Object.keys(u.modelMap).join(', ') || '(none)'}`,
		);
	}
}

// 3. Public models
console.log('\n  Public models:');
for (const m of getModelList()) {
	const serving = config.upstreams.filter((u) => u.modelMap[m.id] || u.embeddingModel);
	console.log(`    • ${m.id} (${m.kind}) — ${serving.length ? `${serving.map((u) => u.id).join(', ')} can serve` : '⚠ no upstream serves this'}`);
}

// 4. Quota DB path writability
try {
	const { QuotaStore } = await import('./quota.ts');
	const q = new QuotaStore(config.quotaDbPath);
	q.close();
	console.log(`\n  Quota DB:    ${config.quotaDbPath} ✓ writable`);
} catch (err) {
	console.log(`\n  Quota DB:    ${config.quotaDbPath} ✗ ${err instanceof Error ? err.message : String(err)}`);
}

// 5. Config summary
console.log('\n  Config:\n' + describeConfig(config));

const ok = major >= 22 && config.upstreams.some((u) => upstreamUsable(u));
console.log(`\n  ${ok ? '✓ Ready to start — run `npm start`' : '⚠ Not ready: install Node >= 22 and/or configure a usable upstream'}\n`);
process.exitCode = ok ? 0 : 1;

function getModelList() {
	return getModelListImpl();
}
function getModelListImpl() {
	// local import kept simple
	return import('./models.ts').then((m) => m.listModels());
}
