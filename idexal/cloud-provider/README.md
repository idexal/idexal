# Idexal Cloud Gateway

A zero-dependency Node.js gateway that exposes a free (freemium) OpenAI-compatible
API on `idexal.com`-class infrastructure. The Idexal AI Core connects to it by
default with **no configuration** — anonymous users get a daily quota, and the
gateway routes each request to the best available upstream (OpenAI / Anthropic /
Ollama) with automatic fallback.

## Quick start

```bash
cd idexal/cloud-provider
npm start          # or: node --experimental-strip-types src/server.ts
```

The gateway binds to `http://127.0.0.1:8787` by default. Verify:

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/v1/models
```

## Endpoints

| Method | Path                    | Description                                    |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/healthz`              | Liveness + advertised models + upstream health |
| GET    | `/v1/models`            | Public model catalog (`idexal-1`, `idexal-1-fast`, `idexal-embed-1`) |
| POST   | `/v1/chat/completions`  | Chat, JSON or SSE streaming (OpenAI format)    |
| POST   | `/v1/embeddings`        | Embeddings (`{ data: [{ index, embedding }] }`) |

### Chat (streaming)

```bash
curl -N http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"idexal-1","messages":[{"role":"user","content":"hi"}],"stream":true}'
```

Anonymous requests just work. Registered keys (paid tier, higher quotas) are sent
as `Authorization: Bearer <key>`.

## Configuration

The gateway reads the environment (a `.env` file next to the entrypoint is also
loaded if present). Run `node --experimental-strip-types src/doctor.ts` to print
the effective configuration.

| Variable                        | Default            | Meaning                                        |
| ------------------------------- | ------------------ | ---------------------------------------------- |
| `PORT`                          | `8787`             | Listen port                                    |
| `HOST`                          | `127.0.0.1`        | Listen host                                    |
| `IDEXAL_CLOUD_KEYS`             | `""`               | Comma-separated registered keys                |
| `ANON_REQUESTS_PER_DAY`         | `50`               | Anonymous daily chat request quota             |
| `ANON_OUTPUT_TOKENS_PER_DAY`    | `100_000`          | Anonymous daily output-token quota             |
| `ANON_EMBEDDINGS_PER_DAY`       | `500`              | Anonymous daily embedding quota                |
| `KEY_REQUESTS_PER_DAY`          | `5000`             | Registered-key daily request quota             |
| `KEY_OUTPUT_TOKENS_PER_DAY`     | `50_000_000`       | Registered-key daily token quota               |
| `KEY_EMBEDDINGS_PER_DAY`        | `100_000`          | Registered-key daily embedding quota           |
| `BURST_PER_MINUTE_ANON`         | `10`               | Anonymous burst limit (per minute)             |
| `BURST_PER_MINUTE_KEY`          | `120`              | Registered-key burst limit                     |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | —            | OpenAI-compatible upstream                     |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` | —        | Anthropic upstream                             |
| `OLLAMA_BASE_URL`               | `http://127.0.0.1:11434` | Ollama upstream (no key needed)          |
| `UPSTREAM_PRIORITY`             | `openai,anthropic,ollama` | Fallback order (comma-separated)      |
| `QUOTA_DB_PATH`                 | `./gateway-quota.db` | SQLite quota database                          |
| `TRUST_DEVICE_HEADER`           | `false`            | Trust `X-Idexal-Device` for anonymous identity |

### Upstream routing

Each model maps to an upstream in priority order. Example with a local Ollama as
the primary and OpenAI as fallback:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
UPSTREAM_PRIORITY=ollama,openai \
OPENAI_API_KEY=sk-... npm start
```

- **Ollama** (no key): chat + embeddings.
- **OpenAI-compatible** (any `OPENAI_BASE_URL`): chat (JSON/SSE) + embeddings.
- **Anthropic**: chat with full protocol translation — OpenAI request → Messages
  API, Anthropic SSE events → OpenAI SSE chunks. Embeddings unsupported (the
  router falls back to another upstream).

If every upstream fails, the gateway returns `503` with a retryable error so the
client (Idexal AI Core) can fail over to another provider cleanly.

## Freemium model

Identities are resolved per request:

- `Authorization: Bearer <registered key>` → `key` tier (higher quotas).
- No key → anonymous tier; identity is a SHA-256 hash of the `X-Idexal-Device`
  header (when `TRUST_DEVICE_HEADER` is on) or the client IP. Raw identifiers are
  never stored or logged.

Quotas are enforced with SQLite daily counters + an in-memory burst limiter.
Exceeding a quota returns `429` with a retryable `code` (`requests_per_day`,
`output_tokens_per_day`, `embeddings_per_day`, `rate_limit`).

## Tests

```bash
node --experimental-strip-types test/gateway.test.ts
```

Spins the real gateway on an ephemeral port with stub upstreams and covers:
health/models, chat (JSON + SSE), Anthropic protocol translation (JSON + SSE),
embeddings, auth (401), quotas (429), and upstream fallback.

## Design

See [`DESIGN.md`](./DESIGN.md) for the full design, roadmap, and the integration
plan with the Idexal AI Core.
