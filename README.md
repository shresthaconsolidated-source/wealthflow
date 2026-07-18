# WealthFlow

**Private net worth & FIRE tracker** — a self-hosted personal finance app for tracking accounts, transactions, and your path to financial independence.


## Features

- **Dashboard** — monthly income / expense / savings at a glance, net worth trend, and per-account balances.
- **Smart transaction entry** — natural-language parsing ("coffee 4.50 yesterday") into typed transactions with category and account inference.
- **Budgets** — per-category monthly budgets with pace tracking.
- **Goals** — savings goals with progress and projections.
- **Analysis** — CAGR on net worth, category breakdowns, and a spending heatmap.
- **FIRE path simulator** — project your financial-independence date from savings rate, expected return, and withdrawal rate.
- **Financial health score** — a composite score computed client-side from savings rate, spending stability, and runway.
- **Recurring detection** — automatically surfaces recurring transactions from history.
- **CSV export** — one-click export of all transactions.
- **PWA** — installable, with a web app manifest.
- **Privacy blur mode** — hide balances instantly when someone is looking over your shoulder.
- **Command palette** — `⌘K` for fast navigation and actions.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4 (CSS-first), design-token variables |
| Animation | Motion (`motion/react`) |
| Charts | Recharts |
| Icons | lucide-react |
| API | Express 4 (JWT auth, rate-limited, gzip via `compression`) |
| Auth | Google OAuth (`@react-oauth/google` + `google-auth-library`), signed JWT sessions |
| Database | Supabase (Postgres, accessed server-side with the service key) |
| Dev runtime | `tsx` running `server.ts` with Vite in middleware mode |
| Hosting | Vercel (serverless API + static SPA) |

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the repo root:

   ```bash
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_SERVICE_KEY=<supabase service-role key>
   GOOGLE_CLIENT_ID=<google oauth client id>
   JWT_SECRET=<long random string>
   ADMIN_EMAILS=you@example.com            # comma-separated admin allowlist
   VITE_GOOGLE_CLIENT_ID=<google oauth client id>  # exposed to the client
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000) — a single Express process serves both the API and the Vite dev middleware.

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `tsx server.ts` | Express + Vite middleware dev server on port 3000 |
| `build` | `vite build` | Production build to `dist/` |
| `preview` | `vite preview` | Preview the production build locally |
| `lint` | `tsc --noEmit` | Type-check the project |

## Deployment

Deployed on **Vercel**. `vercel.json` rewrites `/api/*` to the `api/index.ts` serverless function and everything else to `index.html`, with the static SPA served from the Vite `dist/` output. Set the same environment variables from `.env.local` in the Vercel project settings.

## Architecture

```
React SPA (Vite, Tailwind v4)
        │  fetch + Bearer JWT
        ▼
Express API (api/index.ts)
  · Google ID-token verification → signed JWT session
  · rate limiting, compression, admin allowlist
        │  service-role client
        ▼
Supabase Postgres
  (users, accounts, categories, transactions, settings)
```

- In development, `server.ts` mounts the API and Vite in one process; in production the same API module runs as a Vercel serverless function.
- Analytics are computed client-side in `src/lib` — dedicated engines for forecasting, breakdowns, health scoring, insights, recurring detection, and natural-language transaction parsing — so the backend stays a thin CRUD layer.

## License

Private project — all rights reserved.
