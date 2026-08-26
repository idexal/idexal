import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'

type Lang = 'curl' | 'python' | 'js' | 'go'

const SNIPPETS: Record<string, Record<Lang, string>> = {
  chat: {
    curl: `curl https://api.idexa.com/v1/chat/completions \\
  -H "Authorization: Bearer $IDEXAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "idexal-pro",
    "messages": [
      {"role": "system", "content": "You are a coding assistant."},
      {"role": "user", "content": "Refactor this function"}
    ],
    "stream": true
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.idexa.com/v1",
    api_key="idexal_...",
)

stream = client.chat.completions.create(
    model="idexal-pro",
    messages=[
        {"role": "system", "content": "You are a coding assistant."},
        {"role": "user", "content": "Refactor this function"},
    ],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
    js: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.idexa.com/v1",
  apiKey: process.env.IDEXAL_KEY,
});

const stream = await client.chat.completions.create({
  model: "idexal-pro",
  messages: [
    { role: "system", content: "You are a coding assistant." },
    { role: "user", content: "Refactor this function" },
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`,
    go: `package main

import (
    "context"
    "fmt"
    "openai"
)

func main() {
    client := openai.NewClient(
        openai.WithBaseURL("https://api.idexa.com/v1"),
        openai.WithAPIKey(os.Getenv("IDEXAL_KEY")),
    )
    resp, err := client.CreateChatCompletion(context.Background(),
        openai.ChatCompletionRequest{
            Model: "idexal-pro",
            Messages: []openai.ChatCompletionMessage{
                {Role: "user", Content: "Refactor this function"},
            },
        })
    if err != nil { panic(err) }
    fmt.Println(resp.Choices[0].Message.Content)
}`,
  },
  embeddings: {
    curl: `curl https://api.idexa.com/v1/embeddings \\
  -H "Authorization: Bearer $IDEXAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "idexal-embed",
    "input": "Refactor the auth module"
  }'`,
    python: `client.embeddings.create(
    model="idexal-embed",
    input="Refactor the auth module",
)  # → 1536-dim vector`,
    js: `const emb = await client.embeddings.create({
  model: "idexal-embed",
  input: "Refactor the auth module",
}); // → 1536-dim vector`,
    go: `emb, err := client.CreateEmbeddings(ctx,
    openai.EmbeddingRequest{
        Model: "idexal-embed",
        Input: []string{"Refactor the auth module"},
    })`,
  },
  keys: {
    curl: `# Create a key (dashboard or management API)
curl -X POST https://idexal.com/api/v1/api-keys \\
  -H "Authorization: Bearer $SESSION" \\
  -d '{"name": "production"}'

# Response — the secret is shown ONCE:
# { "id": "key_...", "secret": "idexal_sk_...e92d" }`,
    python: `# Keys are managed from the dashboard:
# https://idexal.com/dashboard/api-keys
# Scope each key: read / write / manage`,
    js: `// Keys are managed from the dashboard:
// https://idexal.com/dashboard/api-keys`,
    go: `// Keys are managed from the dashboard:
// https://idexal.com/dashboard/api-keys`,
  },
}

const ERRORS = [
  ['400', 'invalid_request_error', 'Malformed body — check JSON and required fields.'],
  ['401', 'authentication_error', 'Missing or invalid key. Format: Bearer idexal_sk_…'],
  ['403', 'permission_error', 'Key lacks the required scope (manage/admin).'],
  ['429', 'rate_limit_error', 'Rate limit hit — back off exponentially. Free: 60 req/min, Paid: 1,000 req/min.'],
  ['503', 'provider_error', 'All providers in the fallback chain failed — retry with backoff.'],
]

const TABS: { id: string; icon: string; label: string }[] = [
  { id: 'quickstart', icon: 'fa-rocket', label: 'Quickstart' },
  { id: 'models', icon: 'fa-microchip', label: 'Models' },
  { id: 'keys', icon: 'fa-key', label: 'API Keys' },
  { id: 'errors', icon: 'fa-triangle-exclamation', label: 'Errors' },
  { id: 'limits', icon: 'fa-gauge-high', label: 'Rate Limits' },
  { id: 'webhooks', icon: 'fa-bell', label: 'Webhooks' },
  { id: 'streaming', icon: 'fa-bolt', label: 'Streaming' },
]

function CodeBlock({ code }: { code: string }) {
  return (
    <pre dir="ltr" className="overflow-x-auto rounded-xl bg-[#0b1220] p-5 font-mono text-[12.5px] leading-6 text-slate-200">
      {code}
    </pre>
  )
}

export function ApiReferencePage() {
  const [tab, setTab] = useState('quickstart')
  const [lang, setLang] = useState<Lang>('curl')
  const langs: { id: Lang; label: string }[] = [
    { id: 'curl', label: 'cURL' },
    { id: 'python', label: 'Python' },
    { id: 'js', label: 'JavaScript' },
    { id: 'go', label: 'Go' },
  ]

  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader
          title="Developer Documentation"
          desc="Base URL: https://api.idexa.com/v1 · OpenAI-compatible · Bearer auth"
          actions={<Link to="/developer/playground" className="btn btn-primary"><FaIcon icon="fa-flask" className="h-4 w-4" /> Open Playground</Link>}
        />

        <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-1">
            {TABS.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition ${
                  tab === x.id ? 'bg-blue-500/10 text-primary' : 'text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`}
              >
                <FaIcon icon={x.icon} className="w-4" /> {x.label}
              </button>
            ))}
            <div className="mt-6 border-t border-line pt-4">
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Resources</div>
              <Link to="/models" className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                <FaIcon icon="fa-microchip" className="w-4" /> Model catalog
              </Link>
              <Link to="/developer/sdk" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                <FaIcon icon="fa-boxes-stacked" className="w-4" /> SDKs & libraries
              </Link>
              <a href="https://github.com/idexal" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                <FaIcon icon="fa-github" brand className="w-4" /> GitHub org
              </a>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-6">
            {tab === 'quickstart' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Quickstart</h2>
                <ol className="mt-4 space-y-2 text-sm text-muted">
                  <li><b className="text-[var(--text)]">1.</b> <Link to="/auth/register" className="text-primary hover:underline">Create an account</Link> — you get $5 free inference credits.</li>
                  <li><b className="text-[var(--text)]">2.</b> Generate an API key from <Link to="/dashboard/api-keys" className="text-primary hover:underline">Dashboard → API Keys</Link>. The secret is shown once.</li>
                  <li><b className="text-[var(--text)]">3.</b> Point any OpenAI SDK at <code dir="ltr" className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">https://api.idexa.com/v1</code>.</li>
                </ol>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {langs.map((l) => (
                    <button key={l.id} onClick={() => setLang(l.id)} className={`btn px-3 py-1.5 text-xs ${lang === l.id ? 'btn-primary' : 'btn-secondary'}`}>{l.label}</button>
                  ))}
                </div>
                <div className="mt-4"><CodeBlock code={SNIPPETS.chat[lang]} /></div>
                <h3 className="mt-8 font-bold">Embeddings</h3>
                <div className="mt-3"><CodeBlock code={SNIPPETS.embeddings[lang]} /></div>
              </Card>
            )}

            {tab === 'models' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Models</h2>
                <p className="mt-2 text-sm text-muted">Four first-party models. Full comparison in the <Link to="/models" className="text-primary hover:underline">model catalog</Link>.</p>
                <div className="mt-5 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-[var(--surface-2)] text-muted">
                        {['Model', 'Context', 'Input/1M', 'Output/1M', 'Capabilities'].map((h) => (
                          <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['idexal-pro', '200K', '$3.00', '$15.00', 'chat · code · reasoning · vision · tools'],
                        ['idexal-lite', '128K', '$0.15', '$0.60', 'chat · code · tools'],
                        ['idexal-code', '1M', '$1.50', '$6.00', 'chat · code · reasoning · tools'],
                        ['idexal-embed', '8K', '$0.02', '—', 'embeddings (1536-dim)'],
                      ].map((row) => (
                        <tr key={row[0]} className="border-b border-line last:border-0">
                          <td className="px-4 py-3"><code dir="ltr" className="font-mono text-xs font-bold text-primary">{row[0]}</code></td>
                          <td className="px-4 py-3">{row[1]}</td>
                          <td className="px-4 py-3">{row[2]}</td>
                          <td className="px-4 py-3">{row[3]}</td>
                          <td className="px-4 py-3 text-xs text-muted">{row[4]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="mt-6 font-bold">Routing aliases</h3>
                <p className="mt-2 text-sm text-muted">Combos route to the best available model automatically: <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">auto/fast</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">auto/smart</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">auto/coding</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">auto/cheap</code>.</p>
              </Card>
            )}

            {tab === 'keys' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">API Keys</h2>
                <div className="mt-4"><CodeBlock code={SNIPPETS.keys[lang === 'curl' ? 'curl' : 'python']} /></div>
                <div className="mt-6 space-y-3 text-sm">
                  {[
                    ['Scoping', 'Each key carries a scope: read (GET only), write (inference), manage (management API).'],
                    ['Twin provisioning', 'Keys created on idexal.com are automatically provisioned on api.idexa.com and stay bound to your account.'],
                    ['Rotation', 'Rotate anytime from the dashboard — the old key keeps working for 24h grace.'],
                    ['Budgets', 'Set a monthly USD budget per key; the gateway hard-stops at 100%.'],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-xl border border-line p-4">
                      <div className="font-semibold">{t}</div>
                      <p className="mt-1 text-muted">{d}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'errors' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Error handling</h2>
                <p className="mt-2 text-sm text-muted">Errors follow the OpenAI shape: <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">{`{ "error": { "message", "type", "code" } }`}</code></p>
                <div className="mt-5 space-y-2.5">
                  {ERRORS.map(([code, type, msg]) => (
                    <div key={code} className="flex flex-wrap items-start gap-3 rounded-xl border border-line p-4">
                      <Badge color={code === '429' ? 'amber' : code.startsWith('5') ? 'red' : 'gray'}>{code}</Badge>
                      <code dir="ltr" className="font-mono text-xs text-primary">{type}</code>
                      <span className="flex-1 text-sm text-muted">{msg}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'limits' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Rate limits & quotas</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {[
                    ['Free', '60 req/min', '$5 credits'],
                    ['Paid', '1,000 req/min', 'pay-as-you-go'],
                    ['Enterprise', 'Custom', 'dedicated capacity'],
                  ].map(([tier, rate, billing]) => (
                    <Card key={tier} className="p-5 text-center" hover>
                      <div className="text-lg font-bold">{tier}</div>
                      <div dir="ltr" className="mt-2 font-mono text-sm text-primary">{rate}</div>
                      <div className="mt-1 text-xs text-muted">{billing}</div>
                    </Card>
                  ))}
                </div>
                <h3 className="mt-6 font-bold">Response headers</h3>
                <div className="mt-3 space-y-1.5 text-sm">
                  {[
                    ['x-ratelimit-limit-requests', 'Max requests per window'],
                    ['x-ratelimit-remaining-requests', 'Remaining in this window'],
                    ['x-ratelimit-reset-requests', 'Time until the window resets (ISO 8601)'],
                    ['x-idexal-cost-usd', 'Actual cost of this request'],
                  ].map(([h, d]) => (
                    <div key={h} dir="ltr" className="flex flex-wrap gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2">
                      <code className="font-mono text-xs text-primary">{h}</code>
                      <span className="text-xs text-muted">— {d}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'webhooks' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Webhooks</h2>
                <p className="mt-2 text-sm text-muted">
                  Receive real-time events at your HTTPS endpoint. Manage endpoints from{' '}
                  <Link to="/developer/webhooks" className="text-primary hover:underline">Dashboard → Webhooks</Link>.
                </p>
                <div className="mt-5">
                  <CodeBlock
                    code={`POST /your-endpoint
X-Idexal-Signature: t=1690000000,v1=5f8a…
X-Idexal-Event: usage.threshold

{
  "event": "usage.threshold",
  "created": 1690000000,
  "data": { "usedUsd": 4.5, "budgetUsd": 5 }
}`}
                  />
                </div>
                <div className="mt-5 space-y-2 text-sm text-muted">
                  <p><b className="text-[var(--text)]">Signature verification:</b> HMAC-SHA256 of <code className="font-mono text-xs">{'"{t}.{payload}"'}</code> with your whsec_… secret — compare against the <code className="font-mono text-xs">v1=</code> value.</p>
                  <p><b className="text-[var(--text)]">Retries:</b> 3 attempts (1min, 5min, 30min) — replay older deliveries from the dashboard.</p>
                  <p><b className="text-[var(--text)]">Events:</b> usage.threshold · key.created · key.revoked · invoice.paid · invoice.payment_failed · budget.exceeded · provider.failover</p>
                </div>
              </Card>
            )}

            {tab === 'streaming' && (
              <Card className="p-6 sm:p-8">
                <h2 className="text-xl font-bold">Streaming responses</h2>
                <p className="mt-2 text-sm text-muted">
                  Set <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">"stream": true</code> to receive
                  Server-Sent Events. Each chunk follows the OpenAI delta shape; the stream terminates with <code className="font-mono text-xs">data: [DONE]</code>.
                </p>
                <div className="mt-5">
                  <CodeBlock
                    code={`data: {"choices":[{"delta":{"role":"assistant"}}]}
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"!"}}]}
data: [DONE]`}
                  />
                </div>
                <h3 className="mt-6 font-bold">Pagination</h3>
                <p className="mt-2 text-sm text-muted">
                  List endpoints (usage history, keys, invoices) accept{' '}
                  <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">?cursor=</code> and{' '}
                  <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">?limit=</code> (max 100). Responses include{' '}
                  <code className="font-mono text-xs">next_cursor</code> when more pages exist.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
