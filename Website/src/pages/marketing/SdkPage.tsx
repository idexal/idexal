import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'

type SdkLang = 'typescript' | 'python' | 'go' | 'rust' | 'curl'

const SDKS: { id: SdkLang; name: string; install: string; pkg: string; stable: boolean }[] = [
  { id: 'typescript', name: 'TypeScript / JS', install: 'npm install openai', pkg: 'openai', stable: true },
  { id: 'python', name: 'Python', install: 'pip install openai', pkg: 'openai', stable: true },
  { id: 'go', name: 'Go', install: 'go get github.com/openai/openai-go', pkg: 'openai-go', stable: true },
  { id: 'rust', name: 'Rust', install: 'cargo add async-openai', pkg: 'async-openai', stable: false },
  { id: 'curl', name: 'cURL', install: '# any HTTP client', pkg: '—', stable: true },
]

const EXAMPLES: Record<SdkLang, string> = {
  typescript: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.idexa.com/v1",
  apiKey: process.env.IDEXAL_KEY,
});

// Chat (streaming)
const stream = await client.chat.completions.create({
  model: "idexal-pro",
  messages: [{ role: "user", content: "Explain Rust ownership" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}

// Embeddings
const emb = await client.embeddings.create({
  model: "idexal-embed",
  input: "refactor auth module",
});`,
  python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.idexa.com/v1",
    api_key="YOUR_IDEXAL_KEY",
)

# Chat (streaming)
stream = client.chat.completions.create(
    model="idexal-pro",
    messages=[{"role": "user", "content": "Explain Rust ownership"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")

# Embeddings
emb = client.embeddings.create(
    model="idexal-embed",
    input="refactor auth module",
)
print(len(emb.data[0].embedding))  # 1536`,
  go: `package main

import (
    "context"
    "fmt"
    os"

    openai "github.com/openai/openai-go"
)

func main() {
    client := openai.NewClient(
        openai.WithBaseURL("https://api.idexa.com/v1"),
        openai.WithAPIKey(os.Getenv("IDEXAL_KEY")),
    )

    stream := client.ChatCompletions.NewStreaming(context.Background(),
        openai.ChatCompletionNewParams{
            Model:    "idexal-pro",
            Messages: []openai.ChatCompletionMessageParam{
                openai.UserMessage("Explain Rust ownership"),
            },
        })

    for stream.Next() {
        fmt.Print(stream.Current().Choices[0].Delta.Content)
    }
}`,
  rust: `use async_openai::{
    config::OpenAIConfig,
    types::{ChatCompletionRequestUserMessage, CreateChatCompletionRequestArgs},
    Client,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("https://api.idexa.com/v1")
        .with_api_key(std::env::var("IDEXAL_KEY")?);
    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("idexal-pro")
        .messages([ChatCompletionRequestUserMessage::from(
            "Explain Rust ownership",
        )])
        .build()?;

    let resp = client.chat().create(request).await?;
    println!("{}", resp.choices[0].message.content);
    Ok(())
}`,
  curl: `curl https://api.idexa.com/v1/chat/completions \\
  -H "Authorization: Bearer $IDEXAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "idexal-pro",
    "messages": [{"role": "user", "content": "Explain Rust ownership"}],
    "stream": true
  }'`,
}

export function SdkPage() {
  const [lang, setLang] = useState<SdkLang>('typescript')
  const active = SDKS.find((s) => s.id === lang)!

  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader
          title="SDKs & Libraries"
          desc="Official clients for the Idexal API — any OpenAI SDK works by swapping the base URL."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SDKS.map((s) => (
            <button
              key={s.id}
              onClick={() => setLang(s.id)}
              className={`card-surface p-4 text-start transition hover:-translate-y-0.5 ${lang === s.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between">
                <FaIcon icon={s.id === 'curl' ? 'fa-terminal' : s.id === 'typescript' ? 'fa-js' : s.id === 'python' ? 'fa-python' : s.id === 'go' ? 'fa-golang' : 'fa-rust'} brand={s.id !== 'curl'} className="h-5 w-5 text-primary" />
                {!s.stable && <Badge color="amber">beta</Badge>}
              </div>
              <div className="mt-3 text-sm font-bold">{s.name}</div>
            </button>
          ))}
        </div>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-sm font-bold">{active.name} — install</span>
            <Badge color={active.stable ? 'green' : 'amber'}>{active.stable ? 'stable' : 'beta'}</Badge>
          </div>
          <pre dir="ltr" className="overflow-x-auto bg-[#0b1220] px-5 py-4 font-mono text-[13px] leading-6 text-slate-200">$ {active.install}</pre>
        </Card>

        <Card className="mt-4 overflow-hidden p-0">
          <div className="border-b border-line px-5 py-3 text-sm font-bold">{active.name} — full example (chat + embeddings)</div>
          <pre dir="ltr" className="overflow-x-auto bg-[#0b1220] px-5 py-5 font-mono text-[12.5px] leading-6 text-slate-200">{EXAMPLES[lang]}</pre>
        </Card>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: 'fa-book', title: 'API Reference', desc: 'Every endpoint, error code and rate limit.', to: '/developers' },
            { icon: 'fa-flask', title: 'Live Playground', desc: 'Try any model with real streaming.', to: '/developer/playground' },
            { icon: 'fa-key', title: 'Get an API key', desc: '$5 free credits on signup.', to: '/dashboard/api-keys' },
          ].map((c) => (
            <Card key={c.title} className="p-5" hover>
              <FaIcon icon={c.icon} className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.desc}</p>
              <a href={c.to} className="btn btn-secondary mt-4 w-full">Open →</a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
