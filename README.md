# GobbleCube Dashboard

Build your own dashboards from your [GobbleCube](https://app.gobblecube.ai) data
(e.g. the Blinkit / PharmEasy **Category RCA** page).

GobbleCube does not expose a public API, so this app works by **replaying the
dashboard's own data request** that your browser already makes — you capture it
once from your browser, and the app fetches, charts, and exports the data.

> ⚠️ This tool uses **your own login** to read **your own data**. Check that
> automated access is allowed under your GobbleCube agreement before relying on
> it. The auth token stays in your browser (localStorage) and is never committed.

## What it does

- **Connect** a data source by pasting a `cURL` command copied from your browser.
- **Charts** the response automatically (bar / line), with column pickers.
- **Exports** to CSV (opens in Excel) and "Copy for Google Sheets" (paste as a table).
- Runs a server-side proxy so the browser's CORS rules don't block the request.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

## How to capture a data source

1. Log in to GobbleCube and open the page you want, e.g.
   `https://app.gobblecube.ai/pharmeasy_explore/blinkit/category-rca`.
2. Press **F12** → **Network** tab → filter **Fetch/XHR**.
3. **Reload** the page (or change a filter) so the data request fires.
4. Click the request that returns the chart data (its response is JSON).
5. Right-click → **Copy → Copy as cURL**.
6. In this app, go to **Connect**, paste it, click **Parse → Test → Save**.
7. Open the **Dashboard** and click **Refresh data**.

### Tokens expire

The captured request includes a login/session token that GobbleCube rotates
periodically. When the dashboard shows a `401/403`, just re-capture the cURL
(step 5) and save it again.

## Deploy (open it from your phone)

This is a standard Next.js app, so hosting on **Vercel** takes ~2 minutes and
then auto-deploys on every push:

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. **Import** the `chapter-gobblecube-dashboard` repo.
3. For "Production Branch" you can use `main`, or deploy this feature branch
   (`claude/beautiful-lamport-DYvvT`) as a preview — Vercel auto-detects Next.js,
   no settings needed. Click **Deploy**.
4. Open the resulting `https://<your-app>.vercel.app` URL on your phone, go to
   **Connect**, and paste your captured cURL.

> The GobbleCube call runs **server-side** from Vercel's function (not your
> phone's browser), so CORS is not an issue and there is no host firewall like
> the local dev sandbox. Your token still lives only in your browser.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Recharts.

- `src/lib/curl.ts` — parses copied cURL into a request descriptor.
- `src/app/api/proxy/route.ts` — server-side proxy (locked to `gobblecube.ai`).
- `src/lib/flatten.ts` — auto-detects the table-like data in any JSON response.
- `src/app/page.tsx` — the dashboard (charts, table, exports).
- `src/app/connect/page.tsx` — capture & manage data sources.

## Roadmap / next steps

Once you paste a real captured response, the chart/column mapping can be tuned
to the exact Category-RCA fields (sales, units, RCA driver contributions, etc.),
and we can add saved views, scheduled refresh, and direct Google Sheets sync.
