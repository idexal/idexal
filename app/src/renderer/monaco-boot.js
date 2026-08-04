// Monaco bootstrap.
//
// This lives in its own file rather than an inline <script> because the
// page's CSP is `script-src 'self' 'unsafe-eval'` — with no 'unsafe-inline',
// an inline block is refused outright and the editor silently never loads.
// Loosening the CSP to allow inline scripts would be the wrong trade for a
// few lines of bootstrap.
//
// It is copied verbatim into dist/renderer by esbuild.mjs, next to the `vs/`
// bundle that loader.js resolves against.

(function () {
	// Absolute URL of the vs/ directory next to this page. The page is loaded
	// over file://, where a relative worker path resolves against the URL
	// ROOT — Monaco's worker asked for `file:///vs/base/worker/workerMain.js`
	// and got a NetworkError. Everything below hands it an absolute base.
	var vsBase = new URL('vs/', window.location.href).href;

	// The AMD loader concatenates `paths.vs + '/module/path.js'`, so the
	// configured value must NOT end in a slash or every module resolves
	// through a doubled separator.
	require.config({ paths: { vs: vsBase.replace(/\/$/, '') } });

	// The worker is started from a blob (which is why the CSP needs
	// `worker-src blob:`). A blob has no useful base URL of its own, so it
	// cannot resolve `vs/...` — the shim below tells it where it lives
	// before handing control to Monaco's real worker entry point.
	window.MonacoEnvironment = {
		getWorkerUrl: function () {
			var shim =
				'self.MonacoEnvironment = { baseUrl: ' + JSON.stringify(vsBase) + ' };\n' +
				'importScripts(' + JSON.stringify(vsBase + 'base/worker/workerMain.js') + ');';
			return URL.createObjectURL(new Blob([shim], { type: 'text/javascript' }));
		},
	};

	require(['vs/editor/editor.main'], function () {
		window.__monaco = monaco;
		window.dispatchEvent(new Event('monaco-ready'));
	});
})();
