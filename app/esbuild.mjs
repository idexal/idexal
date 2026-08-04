import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const common = {
	bundle: true,
	sourcemap: true,
	logLevel: 'info',
};

const builds = [
	esbuild.context({
		...common,
		entryPoints: ['src/main/index.ts'],
		outfile: 'dist/main/index.js',
		platform: 'node',
		format: 'cjs',
		// node-pty must stay external: it loads a prebuilt .node and forks
		// helper scripts by path relative to its own directory, neither of
		// which survives being inlined into the bundle.
		external: ['electron', '@lydell/node-pty'],
	}),
	esbuild.context({
		...common,
		entryPoints: ['src/preload/index.ts'],
		outfile: 'dist/preload/index.js',
		platform: 'node',
		format: 'cjs',
		external: ['electron'],
	}),
	esbuild.context({
		...common,
		entryPoints: ['src/renderer/index.ts'],
		outfile: 'dist/renderer/index.js',
		platform: 'browser',
		format: 'iife',
		loader: { '.ttf': 'file' },
	}),
	// Settings is a separate entry so the main renderer bundle stays small
	// and the settings surface can evolve independently.
	esbuild.context({
		...common,
		entryPoints: ['src/renderer/settings.ts'],
		outfile: 'dist/renderer/settings.js',
		platform: 'browser',
		format: 'iife',
	}),
];

const contexts = await Promise.all(builds);

mkdirSync(path.join(__dirname, 'dist/renderer'), { recursive: true });
cpSync(path.join(__dirname, 'src/renderer/index.html'), path.join(__dirname, 'dist/renderer/index.html'));
cpSync(path.join(__dirname, 'src/renderer/style.css'), path.join(__dirname, 'dist/renderer/style.css'));
// Copied, not bundled: it runs before our bundles and speaks to Monaco's AMD
// loader, which esbuild would rewrite. It is a separate file rather than an
// inline script because the page's CSP forbids inline execution.
cpSync(path.join(__dirname, 'src/renderer/monaco-boot.js'), path.join(__dirname, 'dist/renderer/monaco-boot.js'));
// Monaco's built-in editor worker (minimal: no per-language workers yet — degraded
// language-feature mode until LSP workers are wired up in a follow-up milestone).
mkdirSync(path.join(__dirname, 'dist/renderer/vs'), { recursive: true });
cpSync(
	path.join(__dirname, 'node_modules/monaco-editor/min/vs'),
	path.join(__dirname, 'dist/renderer/vs'),
	{ recursive: true },
);

if (watch) {
	await Promise.all(contexts.map((c) => c.watch()));
	console.log('esbuild watching...');
} else {
	await Promise.all(contexts.map((c) => c.rebuild()));
	await Promise.all(contexts.map((c) => c.dispose()));
	console.log('esbuild build complete.');
}
