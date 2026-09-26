# Krishi Bazar AI (কৃষি বাজার)

> For predict the corect crops to grow and the correct things to store for business

AI-assisted weather, crop-price and stock forecasting for Bangladesh farmers
and commodity traders. Mobile-first PWA, Bangla + English, **tap-only input**
(no typing anywhere).

- **Farmers**: 7-day district weather, "what to plant next" ranked by climate
  fit, harvest-time price outlook and forecast certainty.
- **Traders**: buy-now / sell-later margin calculator with storage cost,
  spoilage, a 95% range and probability of profit; a ranked "stock now" list.
- **Community data**: 1–3 push reminders a day ask quick tap questions
  (rain? heat? storm?) and confirm local wholesale/retail prices.
- **Honest accuracy**: every price forecast carries a **95% range** built with
  split-conformal prediction, and the `/accuracy` page shows how often those
  ranges actually held on months the model never saw.

## Architecture

```
Next.js 16 (App Router, Tailwind v4) ── Server Actions ──► Neon Postgres
   │  /api/cron/* (Vercel Cron, daily)                         ▲
   │     ├─ ingest: Open-Meteo, WFP/HDX CSV, TCB (via Python) ─┘
   │     ├─ forecast: builds monthly series ─► /api/py/forecast
   │     └─ notify/1..3: Web Push check-in reminders
   └─ /api/py/* rewrite ─► FastAPI on Vercel Python functions (api/index.py)
                            numpy forecasting + TCB XLSX parsing
```

| Data source | What | Licence |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | 16-day forecast for all 64 districts, 10-year climate normals | CC BY 4.0 |
| [WFP via HDX](https://data.humdata.org/dataset/wfp-food-prices-for-bangladesh) | Monthly district retail prices since 2004 | CC BY-IGO |
| [TCB](https://tcb.gov.bd/pages/daily-rmps) | Daily Dhaka retail min/max (XLSX) | Govt. public data |
| [Chaldal](https://chaldal.com) | Daily regular (non-discounted) retail prices, server-rendered category pages | Public web pages |
| [Shwapno](https://www.shwapno.com) | Daily regular retail prices from product pages listed in its sitemaps (robots.txt respected: no `/api`, no query URLs) | Public web pages |
| [bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode) | Upazilas and unions (EN/BN) | MIT |
| [OpenStreetMap Nominatim](https://nominatim.org) | Village name for a GPS fix | ODbL |
| Community | Tap reports of weather and local prices | — |

### Forecasting model (api/index.py)

Candidate models on log prices (naive, damped drift, seasonal-naive-with-level,
seasonal + drift) are chosen by rolling-origin backtest on the older ⅔ of
history. Interval half-widths are the split-conformal quantile
`⌈(n+1)·0.95⌉`-th smallest absolute backtest error, which guarantees ≥ 95%
coverage when errors are exchangeable. Coverage, MAPE and up/down accuracy
reported in the app are measured on the newest ⅓ of origins only.

## Local development

Requirements: Node 24+, Python 3.12+.

```bash
npm install
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env.local   # then fill in secrets (see below)
npm run dev                   # Next.js on :3000 + FastAPI on :8000
```

No Postgres needed locally: set `DATABASE_URL=pglite:./.pglite-data` to run
real Postgres in-process (PGlite). Load data by calling the cron routes:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/ingest
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/forecast
```

Generate secrets: `openssl rand -base64 32` (SESSION_SECRET, CRON_SECRET) and
`npx web-push generate-vapid-keys` (VAPID pair).

Tests: `npm test` (TS unit tests), `npm run test:py` (pytest),
`npm run lint`, `npm run typecheck`.

## Deployment (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js). Every push to
   `main` deploys to production; every PR gets a preview.
2. Storage → add **Neon Postgres** (sets `DATABASE_URL`).
3. Add env vars: `SESSION_SECRET`, `CRON_SECRET`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
4. Redeploy, then trigger `/api/cron/ingest` then `/api/cron/forecast` once
   (Vercel → Settings → Cron Jobs → Run) to load data immediately.

Cron schedule (UTC; Bangladesh = UTC+6), all daily as required by the Hobby plan:
09:00 BDT reminder · 13:00 reminder · 14:00 weather-history backfill · 16:00 data ingest · 17:00 Chaldal/Shwapno · 18:00 reminder · 20:00 forecasts.

Forecasts are estimates, not financial advice.
