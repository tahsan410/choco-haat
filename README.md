# Choco Haat – Chocolate E-Commerce for Bangladesh

A production-ready online chocolate shop with a full admin dashboard.

**Customers** browse, search, add to cart and check out with Cash on Delivery (৳, Bangladesh phone validation, division → district → upazila). They get an order ID like `CHOC-20261006-0001` and can track the order with **Order ID + phone number**.

**You (admin)** log in at `/admin` to see revenue and sales analytics, manage orders (status, search, filters, archive/delete), products, stock, categories, coupons and delivery settings. Every order is also appended to **Google Sheets** automatically.

## Contents
1. [Features](#features) · 2. [Tech stack](#tech-stack) · 3. [Quick start (demo mode, no setup)](#quick-start-demo-mode) · 4. [Going live: step by step](#going-live-step-by-step) · 5. [Supabase setup](#1-supabase-database--auth) · 6. [Admin setup](#2-create-your-admin-account) · 7. [Google Sheets setup](#3-google-sheets-setup) · 8. [Netlify deployment](#4-deploy-to-github--netlify) · 9. [Security model](#security-model) · 10. [Project structure](#project-structure) · 11. [Tests](#tests) · 12. [Troubleshooting](#troubleshooting)

## Features
**Storefront:** premium responsive design (mobile-first, bottom nav, sticky header) · home with hero, brand categories, featured / best sellers / new arrivals · shop with instant search, category filter, sort · product page with gallery, price comparison (admin-controlled), stock status, ingredients, origin, expiry, storage, authenticity · cart saved in `localStorage` · checkout with validation · order success page · order tracking · About / Contact / FAQ · SEO (titles, meta, Open Graph, canonical, product JSON-LD, sitemap, robots) · skeleton loaders, empty and error states · accessible (labels, focus rings, keyboard, reduced-motion).

**Admin:** protected login · dashboard (revenue, orders by status, items sold, recent orders, low stock, notifications) · sales analytics (today / week / month, revenue by date, top selling products with *orders · quantity · revenue*, estimated profit, best category) · orders (search by ID / phone / name, status + date filters, sort, status badges, order details, archive, delete with confirmation, CSV export, print) · products (add / edit / delete / hide, multi-image upload, +/− stock, low-stock alerts, remove demo products) · categories · customers (derived from orders) · coupons (percent / fixed, min order, expiry, usage limit) · settings (delivery charges, free-delivery threshold, minimum order, store info) · Google Sheets retry tools.

**Business rules enforced on the server:** prices and stock are read from the database (the browser only sends product IDs and quantities) · stock is reduced atomically when an order is placed and restored if the order is cancelled · cancelled orders never count as revenue · per-phone and per-IP rate limits · honeypot field · Google Sheets failures never lose an order (it is flagged and can be retried).

## Tech stack
React 18 · Vite · Tailwind CSS 3 · React Router 6 · Lucide icons · Supabase (Postgres + Auth + Storage, Row Level Security) · Netlify Functions (Node 18+/20, ESM) · Google Sheets API (service account, no SDK).

## Quick start (demo mode)
No accounts needed – everything runs in your browser's `localStorage`.

```bash
npm install
cp .env.example .env      # leave the Supabase values empty
npm run dev               # http://localhost:5173
```

* Shop as a customer, place an order, track it.
* Open `/admin` → on first visit it asks you to **create a demo admin** (stored in your browser only).
* Admin → Analytics → **Add 25 sample orders** to see the charts.

Demo mode is only active in development or when `VITE_ENABLE_DEMO_MODE=true`. It is meant for trying the project, **not** for real customers (data never leaves one browser, and Google Sheets sync is disabled).

## Going live: step by step
You need free accounts on **Supabase**, **GitHub**, **Netlify** and **Google Cloud** (for Sheets).

### 1. Supabase (database + auth)
1. Create a project at <https://supabase.com> (pick the region closest to Bangladesh, e.g. Singapore).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates the tables (`categories`, `products`, `orders`, `order_items`, `settings`, `coupons`, `admins`, `reviews`, `order_counters`), Row Level Security policies, the secure `place_order()` function, the image storage bucket and default settings.
3. *(Optional)* paste `supabase/seed.sql` and run it to load the 14 **demo** products. They are flagged `is_demo`; remove them later from Admin → Products → "Remove demo products". Re-generate with `node scripts/generate-seed.mjs` if you edit `shared/demoCatalog.js`.
4. **Project Settings → API**: copy the *Project URL*, the *anon public* key and the *service_role* key. The service-role key is a secret – it only goes into Netlify's server-side environment variables, never into code or `VITE_` variables.

### 2. Create your admin account
1. Supabase → **Authentication → Users → Add user** → enter your email and a strong password (tick *Auto Confirm User*). Disable public sign-ups under **Authentication → Providers → Email → "Allow new users to sign up"** (recommended).
2. Copy the user's **UID**, then in the SQL Editor run:
   ```sql
   insert into public.admins (user_id, email) values ('PASTE-UID-HERE', 'you@example.com');
   ```
   Only users listed in `admins` can read orders or change anything – this is enforced by the database (RLS), not just the UI. To add another admin repeat both steps.

### 3. Google Sheets setup
1. Go to <https://console.cloud.google.com> → create a project (e.g. "choco-haat").
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create service account** (any name). Open it → **Keys → Add key → JSON** → a file downloads. Keep it private (never commit it).
4. Create a new Google Sheet. Copy its **ID** from the URL: `docs.google.com/spreadsheets/d/<THIS-PART>/edit`.
5. Click **Share** on the sheet and add the service account's email (`client_email` in the JSON, ends with `.iam.gserviceaccount.com`) as **Editor**.
6. In Netlify (next step) set:
   * `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the `client_email`
   * `GOOGLE_PRIVATE_KEY` = the `private_key` value exactly as in the JSON (keep the `\n` sequences), wrapped in double quotes
   * `GOOGLE_SHEET_ID` = the sheet ID
   * `GOOGLE_SHEET_TAB` = `Orders` (optional; the tab and header row are created automatically)

The sheet columns are: *Order ID · Date · Customer Name · Phone · Email · Address · Products · Quantities · Subtotal · Delivery Charge · Total · Payment Method · Order Status*. When you change an order's status in the admin, the status cell in the sheet is updated too. The database is the source of truth; the sheet is your convenient record.

### 4. Deploy to GitHub + Netlify
```bash
git init && git add . && git commit -m "Choco Haat store"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
`.env` is git-ignored – nothing secret is committed.

1. Netlify → **Add new site → Import from Git** → pick the repo. Build settings come from `netlify.toml` (`npm run build`, publish `dist`, functions in `netlify/functions`).
2. **Site configuration → Environment variables** – add:

| Variable | Value | Where used |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | browser |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | browser (public by design) |
| `VITE_SITE_URL` | `https://your-site.netlify.app` (or your domain) | SEO tags |
| `VITE_ENABLE_DEMO_MODE` | `false` | browser |
| `SUPABASE_URL` | Supabase Project URL | functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** key | functions (secret) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_SHEET_ID` / `GOOGLE_SHEET_TAB` | from step 3 | functions (secret) |

   Mark the secret ones as **secret** in Netlify. Then **Deploy site**.
3. Replace `your-site.netlify.app` in `public/sitemap.xml` and `public/robots.txt` with your real domain.
4. **Test it:** place an order on the live site → check that it appears in **Admin → Orders**, in your Google Sheet, and on `/track-order`. A new order should also reduce stock.

SPA routing is handled by the redirect in `netlify.toml`, so refreshing `/shop`, `/product/…`, `/admin`, `/track-order` works.

### Local development with the real backend
`npm i -g netlify-cli`, fill `.env` with the Supabase/Google values, then `netlify dev` (serves the site and the functions on one port).

## Security model
* **No secrets in the browser.** Only the Supabase *anon* key is public. The service-role key and Google credentials live in Netlify environment variables and are used only by functions.
* **Prices are never trusted from the browser.** `create-order` forwards only product IDs + quantities to the database function `place_order()`, which locks the product rows, re-reads price and stock, applies delivery settings and coupons, creates the order and reduces stock in one transaction.
* **Customers cannot read orders directly** (RLS: orders/order_items are admin-only). Tracking goes through `track-order`, which requires the Order ID **and** matching phone and answers identically for "not found" and "wrong phone".
* **Admin protection:** Supabase Auth + `admins` table + RLS on every table; the Google-sync function verifies the caller's token and admin row. Admin pages are code-split, `noindex`, and redirect to login when signed out.
* Input validation + sanitisation on client **and** server, IP rate limiting, per-phone order limit in the database, honeypot field, spreadsheet-formula neutralisation for sheet cells, no internal error details returned to users, security headers via `netlify.toml`.
* Orders are soft-archivable; permanent delete needs confirmation. Deleting a product keeps past orders' names and prices.

## Project structure
```
src/
  components/{ui,store,admin,charts}   reusable UI
  pages/{store,admin}                  route pages
  layouts/                             StoreLayout, AdminLayout (auth guard)
  context/                             cart, catalog, auth, toast, admin data
  services/                            api.js picks supabaseApi or demoApi
  lib/                                 format, search, analytics, seo, supabase client
shared/                                logic used by BOTH browser and functions
  constants.js  orderLogic.js  demoCatalog.js
netlify/functions/                     create-order · track-order · sheet-sync
netlify/lib/                           order core, Sheets client, rate limit
supabase/                              schema.sql, seed.sql (demo data)
tests/                                 node:test unit tests
```

## Tests
`npm test` runs 23 tests covering phone/order validation, server-side pricing, stock, delivery settings, coupons, order numbers (Dhaka time), the Google Sheets client (auth, header, append, idempotent update), `create-order` / `track-order` / `sheet-sync` behaviour including "Sheets down but order saved", and the full customer + admin flow on the demo backend.

## Troubleshooting
* **"Store backend not configured"** – set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify and redeploy.
* **Checkout says the order service is not available** – you are running plain `vite` against Supabase; use `netlify dev`, or deploy.
* **Admin login says "does not have admin access"** – add the user to `public.admins` (step 2).
* **Order is in Admin but not in Google Sheets** – check the red cloud icon on the order; common causes: sheet not shared with the service-account email, wrong `GOOGLE_SHEET_ID`, key pasted without `\n` sequences. Fix it, then **Retry sync** (order page or Settings → Retry all).
* **Product images** – upload in Admin → Products (stored in Supabase Storage bucket `product-images`) or paste an image link.
