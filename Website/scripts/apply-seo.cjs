// One-shot: apply useSeo to marketing pages + ScrollTopButton to shell.
const fs = require('fs');

// 1. Shell: add ScrollTopButton
let r = fs.readFileSync('src/router.tsx', 'utf8');
if (!r.includes('ScrollTopButton')) {
  r = r.replace(
    "import { ToastHost } from '@/components/shared/ToastHost'",
    "import { ToastHost } from '@/components/shared/ToastHost'\nimport { ScrollTopButton } from '@/components/shared/ScrollTopButton'",
  );
  r = r.replace('      <MarketingFooter />\n      <ToastHost />', '      <MarketingFooter />\n      <ToastHost />\n      <ScrollTopButton />');
  fs.writeFileSync('src/router.tsx', r);
  console.log('router: ScrollTopButton added');
}

// 2. Per-page SEO
const seo = [
  ['src/pages/marketing/ModelsPage.tsx', 'AI Models — Pay As You Go', 'Frontier Idexal models behind one OpenAI-compatible endpoint. $5 free credits, transparent per-token pricing.'],
  ['src/pages/marketing/PricingPage.tsx', 'Pricing', 'Simple transparent pricing — start free, pay as you grow. Pro $29/mo, Team $99/mo, custom Enterprise.'],
  ['src/pages/marketing/BlogPage.tsx', 'Blog', 'News, tutorials and engineering deep-dives from the Idexal team.'],
  ['src/pages/marketing/AboutPage.tsx', 'About Us', 'Idexal is an independent software company crafting frontier AI models, a multi-agent IDE and a developer CLI.'],
  ['src/pages/marketing/PhilosophyPage.tsx', 'Computational Elegance', 'Our design philosophy: the aesthetic of invisible intelligence made visible.'],
  ['src/pages/marketing/SecurityAuditPage.tsx', 'Security Audit', 'Full security audit of the Idexal IDE Electron core: 10 issues found and fixed.'],
  ['src/pages/marketing/ContactPage.tsx', 'Contact', 'Talk to the Idexal team — we usually reply within one business day.'],
  ['src/pages/marketing/FeatureDetailPage.tsx', 'Features', 'Everything inside the Idexal IDE — agents, terminal, Git, plugins.'],
];

for (const [f, title, desc] of seo) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('useSeo(')) { console.log(f + ': already has seo'); continue; }
  if (!s.includes("from '@/lib/useSeo'")) {
    const lines = s.split('\n');
    let last = -1;
    lines.forEach((l, i) => { if (/^import /.test(l)) last = i; });
    lines.splice(last + 1, 0, "import { useSeo } from '@/lib/useSeo'");
    s = lines.join('\n');
  }
  const args = JSON.stringify({ title, description: desc }).replace(/^"|"$/g, '').replace(/"/g, '"');
  const hookCall = `  useSeo({ title: ${JSON.stringify(title)}, description: ${JSON.stringify(desc)} })`;
  // insert right before the component's useLang() call
  const re = /(^export function \w+\(\) \{\n)/m;
  if (re.test(s)) {
    s = s.replace(re, `$1${hookCall}\n`);
  } else {
    console.log(f + ': WARNING no component match');
  }
  fs.writeFileSync(f, s);
  console.log(f + ': seo added');
}
