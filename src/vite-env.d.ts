/// <reference types="vite/client" />

interface Window {
  /**
   * Optional runtime API origin (no trailing slash). Set in `index.html` before the app bundle
   * when the host cannot inject `VITE_API_BASE_URL` at build time (e.g. some DigitalOcean static flows).
   */
  __CS_API_BASE_URL__?: string;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /**
   * Optional — Google Maps key: enable Maps Embed API (confirmation iframe), Maps JavaScript API +
   * Geocoding API (address form: pin on map + auto-fill).
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Optional — Sentry browser DSN; only initialized in production builds when set. */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
