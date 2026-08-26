import type {
  ApiKeyItem,
  BlogPost,
  Invoice,
  MockUser,
  PluginItem,
  Provider,
  Task,
  TeamMemberPerf,
  Ticket,
} from '@/types'

// Deterministic PRNG so charts look stable across reloads.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function series(days: number, base: number, variance: number, seed = 42): { day: string; value: number }[] {
  const rnd = seeded(seed)
  const out: { day: string; value: number }[] = []
  let v = base
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(2026, 7, 25)
    d.setDate(d.getDate() - i)
    v += (rnd() - 0.45) * variance
    out.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, value: Math.max(0, Math.round(v)) })
  }
  return out
}

export const MOCK_USERS: MockUser[] = [
  { id: 1, name: 'Ahmed Hassan', email: 'ahmed@example.com', plan: 'Pro', status: 'active', role: 'user', joined: '2026-01-14', country: '🇪🇬 Egypt', apiCalls: 15230, storageGb: 2.3 },
  { id: 2, name: 'Sara Johnson', email: 'sara@example.com', plan: 'Free', status: 'active', role: 'user', joined: '2026-02-03', country: '🇺🇸 USA', apiCalls: 812, storageGb: 0.4 },
  { id: 3, name: 'Omar Khaled', email: 'omar@example.com', plan: 'Enterprise', status: 'banned', role: 'user', joined: '2025-11-20', country: '🇦🇪 UAE', apiCalls: 98221, storageGb: 18.7 },
  { id: 4, name: 'Kenji Tanaka', email: 'kenji@example.com', plan: 'Team', status: 'active', role: 'developer', joined: '2025-09-08', country: '🇯🇵 Japan', apiCalls: 44190, storageGb: 6.1 },
  { id: 5, name: 'Marie Dubois', email: 'marie@example.com', plan: 'Pro', status: 'active', role: 'manager', joined: '2026-03-19', country: '🇫🇷 France', apiCalls: 21774, storageGb: 3.4 },
  { id: 6, name: 'Li Wei', email: 'liwei@example.com', plan: 'Free', status: 'pending', role: 'user', joined: '2026-08-01', country: '🇨🇳 China', apiCalls: 96, storageGb: 0.1 },
  { id: 7, name: 'Noor Al-Sayed', email: 'noor@example.com', plan: 'Team', status: 'active', role: 'team', joined: '2026-04-22', country: '🇯🇴 Jordan', apiCalls: 33450, storageGb: 5.2 },
  { id: 8, name: 'Hans Müller', email: 'hans@example.com', plan: 'Pro', status: 'active', role: 'developer', joined: '2026-05-30', country: '🇩🇪 Germany', apiCalls: 18902, storageGb: 2.9 },
]

export const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-1042', user: 'Ahmed Hassan', amount: 29.0, date: '2026-08-01', method: 'Visa •••• 4242', status: 'paid' },
  { id: 'INV-1041', user: 'Kenji Tanaka', amount: 99.0, date: '2026-07-31', method: 'PayPal', status: 'paid' },
  { id: 'INV-1040', user: 'Omar Khaled', amount: 499.0, date: '2026-07-30', method: 'Visa •••• 8811' as Invoice['method'], status: 'failed' },
  { id: 'INV-1039', user: 'Marie Dubois', amount: 29.0, date: '2026-07-28', method: 'Visa •••• 4242', status: 'paid' },
  { id: 'INV-1038', user: 'Sara Johnson', amount: 15.0, date: '2026-07-27', method: 'Crypto', status: 'refunded' },
  { id: 'INV-1037', user: 'Hans Müller', amount: 29.0, date: '2026-07-26', method: 'Visa •••• 9931' as Invoice['method'], status: 'paid' },
]

const providerHistory = (seed: number) => series(30, 800, 220, seed).map((p) => ({ day: p.day, calls: p.value }))

export const PROVIDERS: Provider[] = [
  { id: 'openai', name: 'OpenAI', kind: 'AI', status: 'connected', models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'], usage30d: 45230, cost: 12.5, fallback: ['anthropic', 'google'], apiKeyMasked: 'sk-…****8f2d', latencyMs: 320, history: providerHistory(11) },
  { id: 'anthropic', name: 'Anthropic', kind: 'AI', status: 'connected', models: ['claude-3.5-sonnet', 'claude-3-opus'], usage30d: 30120, cost: 9.8, fallback: ['openai'], apiKeyMasked: 'sk-ant-…****a77c', latencyMs: 290, history: providerHistory(23) },
  { id: 'google', name: 'Google AI', kind: 'AI', status: 'connected', models: ['gemini-pro', 'gemini-flash'], usage30d: 18740, cost: 4.2, fallback: ['openai'], apiKeyMasked: 'AIza…****92kd', latencyMs: 240, history: providerHistory(37) },
  { id: 'mistral', name: 'Mistral', kind: 'AI', status: 'error', models: ['mistral-large'], usage30d: 2100, cost: 0.9, fallback: [], apiKeyMasked: '…****mm31', latencyMs: 0, history: providerHistory(53) },
  { id: 'deepseek', name: 'DeepSeek', kind: 'AI', status: 'connected', models: ['deepseek-v3'], usage30d: 9840, cost: 1.1, apiKeyMasked: '…****ds44', latencyMs: 380, history: providerHistory(71) },
  { id: 'groq', name: 'Groq', kind: 'AI', status: 'connected', models: ['llama-3.1-70b', 'mixtral-8x7b'], usage30d: 15300, cost: 0.7, apiKeyMasked: 'gsk_…****gr09', latencyMs: 90, history: providerHistory(89) },
  { id: 'ollama', name: 'Ollama (Local)', kind: 'AI', status: 'connected', models: ['llama3:8b', 'codellama:13b'], usage30d: 22110, cost: 0, apiKeyMasked: 'local', latencyMs: 55, history: providerHistory(101) },
  { id: 'cohere', name: 'Cohere', kind: 'Embedding', status: 'connected', models: ['embed-english-v3', 'rerank-v3'], usage30d: 6600, cost: 0.5, apiKeyMasked: '…****ch82', latencyMs: 150, history: providerHistory(113) },
  { id: 'serper', name: 'Serper', kind: 'Search', status: 'connected', models: ['google-search'], usage30d: 3400, cost: 0.3, apiKeyMasked: '…****sp17', latencyMs: 200, history: providerHistory(127) },
  { id: 'custom', name: 'Custom API', kind: 'AI', status: 'disabled', models: [], usage30d: 0, cost: 0, apiKeyMasked: '—', latencyMs: 0, history: [] },
]

export const MODEL_CATALOG: Record<string, { chat: boolean; embedding: boolean; costPer1k: number }[]> = {
  openai: [
    { chat: true, embedding: false, costPer1k: 0.01 },
    { chat: true, embedding: false, costPer1k: 0.03 },
    { chat: true, embedding: false, costPer1k: 0.002 },
  ],
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'introducing-idexal-ide',
    title: 'Introducing Idexal IDE 1.0 — The Future of Code',
    titleAr: 'قدّم إديكسال IDE 1.0 — مستقبل البرمجة',
    excerpt: 'Today we are launching Idexal IDE 1.0: a multi-agent AI development environment built in Rust with a React front-end.',
    excerptAr: 'اليوم نطلق إديكسال IDE 1.0: بيئة تطوير متعددة الوكلاء مبنية بـ Rust مع واجهة React.',
    body: [
      'When we started building Idexal, we asked a simple question: what would an IDE look like if it were designed today, around AI as a first-class citizen?',
      'The answer is a Rust-powered core that indexes your entire project in milliseconds, and a team of specialized agents — architect, coder, tester, reviewer — that collaborate on your behalf.',
      'Version 1.0 ships with an integrated terminal, visual Git tooling, a plugin API and native builds for Windows, macOS and Linux.',
    ],
    bodyAr: [
      'عندما بدأنا بناء إديكسال، طرحنا سؤالاً بسيطاً: كيف ستبدو بيئة تطوير لو صُممت اليوم حول الذكاء الاصطناعي كمواطن من الدرجة الأولى؟',
      'الجواب: نواة مدعومة بـ Rust تفهرس مشروعك بالكامل في أجزاء من الثانية، وفريق من الوكلاء المتخصصين — معماري ومبرمج ومختبر ومراجع — يتعاونون نيابة عنك.',
      'الإصدار 1.0 يتضمن طرفية مدمجة وأدوات Git بصرية وواجهة إضافات وإصدارات أصلية لـ Windows وmacOS وLinux.',
    ],
    date: '2026-08-20',
    category: 'Product',
    readMinutes: 5,
    author: 'The Idexal Team',
  },
  {
    slug: 'rust-engine-internals',
    title: 'Inside the Rust Engine: Sub-second Indexing for 100k Files',
    titleAr: 'داخل محرك Rust: فهرسة بأقل من ثانية لمئة ألف ملف',
    excerpt: 'A deep dive into the tree-sitter pipeline, vector store and memory system that powers Idexal.',
    excerptAr: 'غوص عميق في خط أنابيب tree-sitter ومخزن المتجهات ونظام الذاكرة الذي يشغّل إديكسال.',
    body: [
      'Indexing is the heartbeat of any modern IDE. Ours parses every file into a symbol graph using tree-sitter grammars compiled natively.',
      'We then embed each symbol into a local vector store, enabling semantic search without ever leaving your machine.',
      'The result: rename refactors across 100,000 files that complete before you lift your finger off the key.',
    ],
    bodyAr: [
      'الفهرسة هي نبض أي بيئة تطوير حديثة. نحن نحلل كل ملف إلى مخطط رموز باستخدام قواعد tree-sitter المترجمة أصلياً.',
      'ثم نضمّن كل رمز في مخزن متجهات محلي، مما يتيح بحثاً دلالياً دون مغادرة جهازك.',
      'النتيجة: إعادة تسمية عبر مئة ألف ملف تكتمل قبل أن ترفع إصبعك عن الزر.',
    ],
    date: '2026-08-12',
    category: 'Engineering',
    readMinutes: 9,
    author: 'Layla Mahmoud',
  },
  {
    slug: 'multi-agent-workflows',
    title: 'Multi-Agent Workflows: Architect, Code, Test, Review',
    titleAr: 'سير عمل متعدد الوكلاء: تصميم وبرمجة واختبار ومراجعة',
    excerpt: 'How to orchestrate specialized agents to turn a one-line idea into a reviewed pull request.',
    excerptAr: 'كيف تنسق وكلاء متخصصين لتحويل فكرة من سطر واحد إلى طلب دمج مُراجَع.',
    body: [
      'The orchestrator routes your intent to the right specialist. Ask for a feature and the architect drafts a plan first.',
      'The coder implements it against your codebase conventions, the tester writes failing tests then makes them pass, and the reviewer signs off.',
      'Every step is visible, editable and interruptible — agents assist, you stay in control.',
    ],
    bodyAr: [
      'يوجّه المنسّق طلبك إلى الأخصائي المناسب. اطلب ميزة وسيضع المعماري خطة أولاً.',
      'ينفّذها المبرمج وفق معايير مشروعك، ويكتب المختبر اختبارات فاشلة ثم يجعلها تنجح، ويوقّع المراجع في النهاية.',
      'كل خطوة مرئية وقابلة للتعديل والإيقاف — الوكلاء يساعدون، وأنت تبقى متحكماً.',
    ],
    date: '2026-08-05',
    category: 'Tutorials',
    readMinutes: 7,
    author: 'Yousef Adel',
  },
  {
    slug: 'plugin-api-guide',
    title: 'Building Your First Idexal Plugin',
    titleAr: 'بناء أول إضافة لإديكسال',
    excerpt: 'From zero to marketplace: scaffolding, APIs, packaging and publishing your plugin.',
    excerptAr: 'من الصفر إلى السوق: إنشاء المشروع والواجهات والحزم والنشر.',
    body: ['Plugins are plain TypeScript modules with a manifest.', 'Hook into commands, editors and panels through a typed API surface.', 'Publish with a single CLI command once review passes.'],
    bodyAr: ['الإضافات وحدات TypeScript عادية مع ملف تعريف.', 'اربط نفسك بالأوامر والمحررات واللوحات عبر واجهة موجهة بالأنواع.', 'انشر بأمر واحد عبر CLI بعد اجتياز المراجعة.'],
    date: '2026-07-28',
    category: 'Tutorials',
    readMinutes: 6,
    author: 'Nadia Fathi',
  },
  {
    slug: 'why-we-chose-tauri-style-architecture',
    title: 'Why Our Desktop Shell Stays Light on Memory',
    titleAr: 'لماذا تبقى واجهة سطح المكتب لدينا خفيفة الذاكرة',
    excerpt: 'Panel lazy-loading, virtualized trees and a strict render budget keep Idexal under 300MB.',
    excerptAr: 'تحميل اللوحات عند الحاجة والأشجار الافتراضية وميزانية رسم صارمة تُبقي إديكسال تحت 300 ميغابايت.',
    body: ['We measured everything. Every panel pays rent for its megabytes.', 'Lazy-loading 69 panels cut cold-start time from 4.1s to 900ms.'],
    bodyAr: ['قسنا كل شيء. كل لوحة تدفع إيجار ميغابايتاتها.', 'التحميل الكسول لـ 69 لوحة قلّص زمن الإقلاع من 4.1 ثانية إلى 900 ملي ثانية.'],
    date: '2026-07-15',
    category: 'Engineering',
    readMinutes: 8,
    author: 'The Idexal Team',
  },
  {
    slug: 'roadmap-h2-2026',
    title: 'Roadmap H2 2026: Remote Workspaces & Agent Marketplace',
    titleAr: 'خطة النصف الثاني 2026: مساحات عمل بعيدة وسوق وكلاء',
    excerpt: 'What we are shipping next: cloud dev containers, agent templates and real-time collaboration.',
    excerptAr: 'ما سنطلقه قريباً: حاويات تطوير سحابية وقوالب وكلاء وتعاون فوري.',
    body: ['Remote workspaces bring reproducible environments to every machine.', 'The agent marketplace lets teams share tuned specialists.'],
    bodyAr: ['مساحات العمل البعيدة تجلب بيئات قابلة للتكرار لكل جهاز.', 'سوق الوكلاء يتيح للفرق مشاركة وكلاء مضبوطين.'],
    date: '2026-06-30',
    category: 'Product',
    readMinutes: 4,
    author: 'The Idexal Team',
  },
]

export const TEAM_PERF: TeamMemberPerf[] = [
  { name: 'Ali Mansour', tickets: 23, avgTimeH: 2.1, rating: 4.9, online: true },
  { name: 'Noor Al-Sayed', tickets: 19, avgTimeH: 1.8, rating: 4.7, online: true },
  { name: 'Zaid Hamdan', tickets: 31, avgTimeH: 3.2, rating: 4.5, online: false },
  { name: 'Rana Khalil', tickets: 17, avgTimeH: 2.6, rating: 4.8, online: true },
  { name: 'Fadi Nasser', tickets: 12, avgTimeH: 1.4, rating: 4.6, online: false },
]

export const TICKETS: Ticket[] = [
  { id: 'TK-2041', subject: 'Cannot sign in with GitHub SSO', requester: 'mike@corp.io', assignee: 'Ali Mansour', priority: 'high', status: 'open', ageHours: 3 },
  { id: 'TK-2040', subject: 'Plugin marketplace payout missing', requester: 'dev@plugins.dev', assignee: 'Noor Al-Sayed', priority: 'high', status: 'pending', ageHours: 9 },
  { id: 'TK-2039', subject: 'Terminal fonts blurry on Linux HiDPI', requester: 'sam@linux.sh', assignee: 'Zaid Hamdan', priority: 'medium', status: 'open', ageHours: 26 },
  { id: 'TK-2038', subject: 'Request: Go template for new projects', requester: 'gopher@golang.org', assignee: 'Rana Khalil', priority: 'low', status: 'resolved', ageHours: 48 },
  { id: 'TK-2037', subject: 'Invoice VAT details wrong', requester: 'finance@acme.co', assignee: 'Fadi Nasser', priority: 'medium', status: 'resolved', ageHours: 52 },
]

export const MY_TASKS: Task[] = [
  { id: 1, title: 'Build Pricing Page UI', done: false, priority: 'high', due: 'Tomorrow' },
  { id: 2, title: 'Fix login redirect bug', done: true, priority: 'medium', due: 'Done' },
  { id: 3, title: 'Write API documentation', done: false, priority: 'low', due: 'Friday' },
  { id: 4, title: 'Review PR #234 (auth refactor)', done: false, priority: 'high', due: 'Today' },
]

export const USER_API_KEYS: ApiKeyItem[] = [
  { id: 'key_1', name: 'production', masked: 'sk-…8f2d', created: '2026-03-02', lastUsed: '2h ago', requests: 12340 },
  { id: 'key_2', name: 'staging', masked: 'sk-…a1b2', created: '2026-05-11', lastUsed: '1d ago', requests: 1230 },
]

export const MY_PLUGINS: PluginItem[] = [
  { id: 'themex', name: 'ThemeX', installs: 1230, rating: 4.8, revenue: 450, status: 'live' },
  { id: 'gitpro', name: 'GitPro Tools', installs: 890, rating: 4.6, revenue: 320, status: 'review' },
  { id: 'vimx', name: 'VimX Bindings', installs: 2140, rating: 4.9, revenue: 0, status: 'live' },
]
