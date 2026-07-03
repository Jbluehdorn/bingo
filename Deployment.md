# Deployment Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient) — only required for deployment

---

## Local Development

No Cloudflare account needed. The local dev server simulates D1 and R2 using local SQLite files via Wrangler's miniflare.

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Run the database migration (creates a local SQLite DB in .wrangler/state/)
npm run db:migrate:local
```

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The dev server supports hot reload. Local D1 data persists in `.wrangler/state/` between restarts.

---

## Deploying to Cloudflare Pages

### One-time Cloudflare setup

These steps only need to be done once before your first deployment.

**1. Authenticate with Cloudflare**

```bash
npx wrangler login
```

**2. Create the D1 database**

```bash
npx wrangler d1 create bingo-db
```

Copy the `database_id` from the output and paste it into `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "bingo-db",
    "database_id": "YOUR_DATABASE_ID_HERE"  // <-- replace this
  }
]
```

**3. Create the R2 bucket**

```bash
npx wrangler r2 bucket create bingo-uploads
```

**4. Run the database migration on the remote database**

```bash
npm run db:migrate:remote
```

### Deploy

```bash
npm run deploy
```

This builds the app with the OpenNext Cloudflare adapter and deploys it to Cloudflare Pages. The URL will be printed at the end of the output.

### Re-deploying after code changes

```bash
npm run deploy
```

### Re-running migrations after schema changes

If you update `migrations/0001_initial.sql` or add a new migration file:

```bash
# Apply to local dev DB
npm run db:migrate:local

# Apply to the live Cloudflare D1 database
npm run db:migrate:remote
```

---

## Environment Summary

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with simulated D1 + R2 |
| `npm run build` | Build the Next.js app (used internally by deploy) |
| `npm run db:migrate:local` | Apply migrations to the local SQLite dev database |
| `npm run db:migrate:remote` | Apply migrations to the live Cloudflare D1 database |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run cf-typegen` | Regenerate TypeScript types for Cloudflare bindings |
