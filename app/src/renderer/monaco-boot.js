// Monaco bootstrap.
//
// This lives in its own file rather than an inline <script> because the
// page's CSP is `script-src 'self' 'unsafe-eval'` — with no 'unsafe-inline',
// an inline block is refused outright and the editor silently never loads.
// Loosening the CSP to allow inline scripts would be the wrong trade for a
// three-line bootstrap.
//
// It is copied verbatim into dist/renderer by esbuild.mjs, next to the `vs/`
// bundle that loader.js resolves against.
require.config({ paths: { vs: 'vs' } });
require(['vs/editor/editor.main'], function () {
	window.__monaco = monaco;
	window.dispatchEvent(new Event('monaco-ready'));
});
