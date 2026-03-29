# GreenerCheck

GreenerCheck is a Next.js app that helps Ontario homeowners estimate Canada Greener Homes–style federal grants and provincial rebates in about a minute, then optionally emails a summary. A separate **For installers** page describes a white-label calculator offer for solar and heat pump contractors.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Create `.env.local` at the project root and add the variables from the table below. At minimum you need keys for any features you want to try (Claude, Resend).

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | For AI summary | Claude API (streaming audit copy on `/api/generate`) |
| `RESEND_API_KEY` | For emails | Transactional email (subscribe + installer inquiry) |
| `NEXT_PUBLIC_SITE_URL` | **Yes (prod)** | Canonical URLs, Open Graph, sitemap, robots — use your real origin (e.g. `https://greenercheck.ca`) |
| `NOTIFY_EMAIL` | Optional | Where lead notifications are sent (homeowner + installer forms) |

**Also used (optional but recommended in production):**

| Variable | Purpose |
|----------|---------|
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `hello@yourdomain.ca` |
| `SITE_OWNER_NAME` | Footer / email branding |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 (e.g. `G-XXXXXXXXXX`) — scripts load only if set |

## Deploy on Vercel

1. Push the repo to **GitHub** (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com), **Import** the project and pick the repo.
3. Framework is **Next.js** (see `vercel.json`).
4. Add the same environment variables under **Project → Settings → Environment Variables** (Production + Preview as needed).
5. Deploy. After the first deploy, confirm **`NEXT_PUBLIC_SITE_URL`** matches your production domain.

**Cron:** A daily job calls `GET /api/daily-digest` at **14:00 UTC** (≈ 9:00 AM US Eastern Standard Time). Adjust the schedule in `vercel.json` if you need EDT alignment. Crons require a [Vercel plan that supports them](https://vercel.com/docs/cron-jobs).

**Leads on Vercel:** Serverless filesystem is read-only. In production, leads are **logged to the console** and should be backed by **email to `NOTIFY_EMAIL`** until you add a database (see `TODO` in `lib/storage.ts`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run build` | Production build |
| `npm run start` | Start production server (after `build`) |
| `npm run lint` | ESLint |
