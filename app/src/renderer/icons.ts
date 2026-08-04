// Idexal — icon set
//
// Stroke icons in the FontAwesome/Lucide visual language, authored here and
// inlined as SVG. Inlined rather than linked because the renderer runs under
// a strict CSP that blocks external font/icon CDNs — and because emoji
// glyphs (📁 ⎇ ◆) render inconsistently across platforms and look amateur.
//
// All icons share one grid: 24×24 viewBox, 1.75 stroke, round caps/joins,
// `currentColor` — so they inherit text colour and stay optically consistent
// at any size.

const PATHS: Record<string, string> = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
	automation: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
	sparkle:
		'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
	folder: '<path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8L11.7 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
	hash: '<path d="M9 4 7 20M17 4l-2 16M4.5 9H19M4 15h14.5"/>',
	gear:
		'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
	branch: '<circle cx="7" cy="5" r="2.2"/><circle cx="7" cy="19" r="2.2"/><circle cx="17" cy="9" r="2.2"/><path d="M7 7.2v9.6M17 11.2c0 3-2.3 4.3-5 4.8"/>',
	send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
	chevron: '<path d="m6 9 6 6 6-6"/>',
	close: '<path d="M6 6l12 12M18 6L6 18"/>',
	back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
	file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
	terminal: '<path d="M5 8l4 4-4 4M12 16h7"/><rect x="2.5" y="3.5" width="19" height="17" rx="2"/>',
	diff: '<path d="M12 4v10M7 9h10M12 18h.01"/><rect x="3.5" y="3.5" width="17" height="17" rx="2"/>',
	monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8.5 20.5h7M12 17.5v3"/>',
	refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
	check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
	dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
	logo: '<path d="M4 18 11 4l3 7h6l-7 9-2.5-6.5H4z"/>',
	// Several agents fanning out from one task — the multi-agent chip.
	agents: '<circle cx="5" cy="6" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="18" cy="12" r="2.2"/><path d="M7.2 6.9 15.8 11M7.2 17.1 15.8 13"/>',
};

/** Build an inline SVG icon element. `size` is in px. */
export function icon(name: keyof typeof PATHS | string, size = 16): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', String(size));
	svg.setAttribute('height', String(size));
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '1.75');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.setAttribute('aria-hidden', 'true');
	svg.classList.add('icon-svg');
	// Paths are authored in this file, never user input, so assigning markup
	// here cannot inject anything a caller controls.
	svg.innerHTML = PATHS[name] ?? PATHS.dot;
	return svg;
}

/** Replace every `[data-icon]` placeholder in the document with its icon. */
export function hydrateIcons(root: ParentNode = document): void {
	for (const host of root.querySelectorAll<HTMLElement>('[data-icon]')) {
		const name = host.dataset.icon;
		if (!name || host.dataset.iconDone === '1') continue;
		const size = Number(host.dataset.iconSize ?? '16');
		host.textContent = '';
		host.appendChild(icon(name, Number.isFinite(size) ? size : 16));
		host.dataset.iconDone = '1';
	}
}
