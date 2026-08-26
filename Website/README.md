<div align="center">

# 🌐 Idexal Website

**Official website & documentation for the Idexal ecosystem**

React + Vite + Tailwind CSS · Prisma backend · deployed at [idexal.com](https://idexal.com)

</div>

---

## 🛠️ Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend/DB:** Prisma (SQLite dev / Postgres prod)
- **Routing & SEO:** Static marketing pages + blog

## 🚀 Develop

```bash
npm install
npm run dev          # local dev server
npm run build        # production build → dist/
npm run typecheck    # TypeScript check
```

### Database (Prisma)

```bash
npx prisma generate        # client
npm run db:migrate         # apply migrations (dev)
```

Copy `.env.example` → `.env` and fill in values. Never commit `.env`.

## 📁 Structure

```
src/          # React app (marketing, blog, docs)
public/       # Static assets & icons
prisma/       # Schema + migrations
docs/         # Deployment & integration guides
scripts/      # Build/deploy helpers
```

## 🤝 The Idexal Ecosystem

| Repository | Description |
|---|---|
| [idexal-ide](https://github.com/idexal/idexal-ide) | Desktop IDE — Electron + React + Monaco |
| [idexal-cli](https://github.com/idexal/idexal-cli) | Terminal assistant |
| [idexal-skills](https://github.com/idexal/idexal-skills) | 118+ bundled agent skills |
| **idexal-website** ← you are here | Website & docs |

## 📄 License

MIT © [Zakariae Lahbabi](https://github.com/lahbabidev)
