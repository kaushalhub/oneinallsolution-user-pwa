/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
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
