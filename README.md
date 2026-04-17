# CleanSwift — User PWA

Vite + React + TypeScript progressive web app for customers (home services, wallet, bookings, payments).

## Requirements

- Node.js 20+ (CI uses 22)
- npm 10+

## Setup

```bash
cd user-pwa
cp .env.example .env
```

| Variable                   | Required                  | Purpose                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`        | **Yes** on public deploys | Backend API origin (no trailing slash). `vite dev` and **`vite preview` on localhost / private LAN** (e.g. `192.168.x.x` with `preview --host`) use a fallback if unset — see `src/lib/api.ts`. Public DNS without this var will not start. |
| `VITE_GOOGLE_MAPS_API_KEY` | No                        | Maps Embed (confirmation), Maps JS + Geocoding (address pin / auto-fill). Enable the matching APIs in Google Cloud.                                                                                                                         |
| `VITE_SENTRY_DSN`          | No                        | Production error reporting (`@sentry/react`). Omit locally to skip.                                                                                                                                                                         |

## Scripts

| Command                                   | Description                                 |
| ----------------------------------------- | ------------------------------------------- |
| `npm run dev`                             | Dev server with PWA plugin enabled          |
| `npm run build`                           | Typecheck + production bundle               |
| `npm run preview`                         | Serve `dist`                                |
| `npm run lint` / `npm run lint:fix`       | ESLint                                      |
| `npm run format` / `npm run format:check` | Prettier                                    |
| `npm run test`                            | Vitest (unit tests)                         |
| `npm run check`                           | Lint + format + test + build (release gate) |

## DigitalOcean — same `VITE_API_BASE_URL` error on every deploy

Vite **bakes** `import.meta.env.VITE_API_BASE_URL` when **`npm run build`** runs. If DO runs the build **without** that variable (e.g. it is only set as “runtime” in the UI, or not passed into the build step), production JS will keep throwing — it will look like “nothing changed” after you edit `.env` locally.

**Preferred:** In **App Platform** → your static/web component → **Environment variables**, add `VITE_API_BASE_URL` = `https://your-api.tld` (no trailing slash) with scope **Build time** (and **Run time** if the UI offers both). Trigger a **new deploy** so the build runs again.

**Alternative (no build-time env):** The app resolves API base in this order (`src/lib/api.ts`): build env → `window.__CS_API_BASE_URL__` → **`<meta name="cleanswift-api-base" content="https://your-api.tld">`** in `<head>`.

1. **Meta:** After one deploy that includes the current `user-pwa` bundle, set `<meta name="cleanswift-api-base" content="https://your-api.tld" />` in `index.html` (no trailing slash). Later API host changes only need editing that meta (or redeploying `index.html`), not a full front-end rebuild.

2. **Script:** Before the main module:

```html
<script>
  window.__CS_API_BASE_URL__ = 'https://your-api.tld';
</script>
```

**If you still see the _old_ error text** mentioning only `user-pwa/.env`, the browser or CDN is serving an **old** `index-….js` — purge cache, bump deploy, or open an incognito window.

**Docker on DO:** pass `ARG`/`ENV VITE_API_BASE_URL=...` before `npm run build` in the image.

## Architecture notes

- **API client** (`src/lib/api.ts`): timeouts, JSON errors, optional `access_token` query on some GETs for reverse-proxy compatibility, **401 with Bearer** clears session and redirects to `/login?reason=session` except on public auth routes (`src/lib/authWall.ts`).
- **Session** (`src/lib/session.ts`): `localStorage` JSON; cleared on invalid profile at splash and on forced 401.
- **Error boundary** (`src/components/AppErrorBoundary.tsx`): wraps the app in `main.tsx`; optional Sentry capture in production when `VITE_SENTRY_DSN` is set.
- **Payments**: hosted checkout iframe (`HostedPaymentFrame`) with a restrictive `sandbox`.

## CI

GitHub Actions workflow `.github/workflows/user-pwa-ci.yml` runs when `user-pwa/**` changes.

## Security (operator checklist)

- Serve the app with **HTTPS** and tighten **CSP** at the CDN / reverse proxy (Vite dev uses inline scripts — do not copy dev CSP to prod blindly).
- Restrict **Google Maps** and **API** keys by HTTP referrer / bundle ID in cloud consoles.
- Review token-in-query behavior for your nginx / API gateway (`api.ts`).
