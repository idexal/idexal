#!/usr/bin/env node
// Idexal — repo-level setup entry.
// Thin wrapper over the AI Core's setup wizard. Run with:
//   node idexal/setup.ts            interactive (recommended)
//   node idexal/setup.ts --yes      scripted/headless install
//   npx @idexal/ai-core setup       (same wizard, via the global command)
// Builds the first ~/.idexal/config.json by probing what this machine has
// (Ollama, API keys, Idexal Cloud) and suggesting a provider priority order.

import { runSetup } from './ai-core/src/setup.ts';

runSetup().catch((err) => {
	console.error(`\n  ✗ Setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
	process.exitCode = 1;
});
