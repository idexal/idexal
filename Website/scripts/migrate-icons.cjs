// One-shot migration: lucide-react JSX icons → Font Awesome <FaIcon>.
const fs = require('fs');
const path = require('path');

const faSrc = fs.readFileSync('src/components/shared/FaIcon.tsx', 'utf8');
const map = {};
for (const m of faSrc.matchAll(/^\s{2}(\w+):\s*\{\s*icon:\s*'([^']+)'\s*(,\s*brand:\s*true)?\s*(,\s*regular:\s*true)?\s*\}/gm)) {
  map[m[1]] = { icon: m[2], brand: !!m[3], regular: !!m[4] };
}

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(f) && !p.includes('FaIcon')) files.push(p);
  }
};
walk('src');

const names = Object.keys(map).sort((a, b) => b.length - a.length);
const jsxRe = new RegExp(`<(${names.join('|')})\\b([^>]*?)/>`, 'gs');

let total = 0, changed = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let count = 0;
  src = src.replace(jsxRe, (full, name, propsRaw) => {
    const def = map[name];
    if (!def) return full;
    const cm = propsRaw.match(/className=\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|className="([^"]*)"/s);
    const cls = (cm ? (cm[1] ?? cm[2] ?? '') : '').trim();
    const sm = propsRaw.match(/style=\{([^}]+)\}/);
    const style = sm ? sm[1] : null;
    const parts = [`icon="${def.icon}"`];
    if (def.brand) parts.push('brand');
    if (def.regular) parts.push('regular');
    if (cls) parts.push(`className="${cls}"`);
    if (style) parts.push(`style={${style}}`);
    count++;
    return `<FaIcon ${parts.join(' ')} />`;
  });
  if (count > 0) {
    const importRe = /import\s*\{([^}]*)\}\s*from\s*'lucide-react'\n?/;
    const im = src.match(importRe);
    if (im) {
      const names2 = im[1].split(',').map((s) => s.trim()).filter(Boolean);
      const remaining = names2.filter((n) => {
        const bare = n.replace(/\s+as\s+\w+/, '');
        return new RegExp(`<${bare}[\\s/>]`).test(src);
      });
      if (remaining.length === 0) src = src.replace(importRe, '');
      else src = src.replace(importRe, `import { ${remaining.join(', ')} } from 'lucide-react'\n`);
    }
    if (!src.includes("from '@/components/shared/FaIcon'")) {
      const lines = src.split('\n');
      let lastImport = -1;
      lines.forEach((l, i) => { if (/^import /.test(l)) lastImport = i; });
      lines.splice(lastImport + 1, 0, "import { FaIcon } from '@/components/shared/FaIcon'");
      src = lines.join('\n');
    }
    fs.writeFileSync(f, src);
    total += count;
    changed++;
    console.log(`${f}: ${count}`);
  }
}
console.log(`TOTAL: ${total} icons in ${changed} files`);
