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

| Variable                   | Required                | Purpose                                                                                                                                                                                                                          |
| -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`        | **Yes** on real deploys | Backend API origin (no trailing slash). `vite dev` and **`vite preview` on localhost** use a temporary fallback if unset — see `src/lib/api.ts`. On any non-localhost host without this var, the app will not start (by design). |
| `VITE_GOOGLE_MAPS_API_KEY` | No                      | Maps Embed (confirmation), Maps JS + Geocoding (address pin / auto-fill). Enable the matching APIs in Google Cloud.                                                                                                              |
| `VITE_SENTRY_DSN`          | No                      | Production error reporting (`@sentry/react`). Omit locally to skip.                                                                                                                                                              |

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
