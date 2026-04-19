import { shouldSessionRedirectOn401 } from './authWall';
import { clearSession } from './session';

const DEV_FALLBACK_API_BASE_URL = 'https://api.oneinallsolution.com';
// const DEV_FALLBACK_API_BASE_URL = 'http://localhost:9090';

function normalizeApiOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Runtime override for hosts where env is not available at `vite build` time (see README). */
function readRuntimeApiOverride(): string {
  if (typeof window === 'undefined') return '';
  const v = window.__CS_API_BASE_URL__;
  return typeof v === 'string' ? normalizeApiOrigin(v) : '';
}

/** Optional `<meta name="cleanswift-api-base" content="https://api...">` in `index.html` (no rebuild of JS). */
function readMetaApiOverride(): string {
  if (typeof document === 'undefined') return '';
  const el = document.querySelector('meta[name="cleanswift-api-base"]');
  const c = el?.getAttribute('content');
  if (typeof c !== 'string') return '';
  return normalizeApiOrigin(c);
}

/**
 * True on localhost / LAN (e.g. `vite preview --host`). Public internet hostnames must use env or
 * `window.__CS_API_BASE_URL__`.
 */
function isLikelyDevOrLanPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '' || h === '0.0.0.0') return true;
  if (h === '[::1]' || h === '::1') return true;
  if (h.endsWith('.local')) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (![a, b].every((n) => n >= 0 && n <= 255)) return false;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/**
 * Order: Vite build env → `window.__CS_API_BASE_URL__` → `<meta name="cleanswift-api-base">` → dev → LAN preview
 * fallback → throw on public hosts.
 */
function resolveApiBaseUrl(): string {
  const fromBuild = normalizeApiOrigin(import.meta.env.VITE_API_BASE_URL || '');
  const fromRuntime = readRuntimeApiOverride();
  const fromMeta = readMetaApiOverride();
  const resolved = fromBuild || fromRuntime || fromMeta;
  if (resolved) return resolved;
  if (import.meta.env.DEV) return DEV_FALLBACK_API_BASE_URL.replace(/\/+$/, '');
  if (isLikelyDevOrLanPreview()) {
    console.warn(
      '[cleanswift] No API URL: set VITE_API_BASE_URL at build, or meta cleanswift-api-base / window.__CS_API_BASE_URL__. Using dev fallback for local/LAN preview only.'
    );
    return DEV_FALLBACK_API_BASE_URL.replace(/\/+$/, '');
  }
  throw new Error(
    'API base URL missing: set VITE_API_BASE_URL before `npm run build`, or add <meta name="cleanswift-api-base" content="https://your-api"> in index.html, or window.__CS_API_BASE_URL__. See user-pwa README (DigitalOcean). Same host as EXPO_PUBLIC_API_BASE_URL.'
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

const MEDIA_URL_REPLACE_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);

function isApiUploadPath(pathname: string): boolean {
  const p = pathname || '';
  return p.startsWith('/uploads/');
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  try {
    const u = new URL(trimmed);
    if (isApiUploadPath(u.pathname)) {
      return `${API_BASE_URL}${u.pathname}${u.search}${u.hash}`;
    }
    if (MEDIA_URL_REPLACE_HOSTS.has(u.hostname.toLowerCase())) {
      return `${API_BASE_URL}${u.pathname}${u.search}${u.hash}`;
    }
    return trimmed;
  } catch {
    if (/^uploads\//i.test(trimmed)) {
      return `${API_BASE_URL}/${trimmed}`;
    }
    return trimmed;
  }
}

const DEFAULT_TIMEOUT_MS = 25_000;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  timeoutMs?: number;
  query?: Record<string, string | undefined>;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let pathWithQuery = path.startsWith('/') ? path : `/${path}`;
  if (options.query) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== '') sp.set(k, v);
    }
    const q = sp.toString();
    if (q) pathWithQuery += (pathWithQuery.includes('?') ? '&' : '?') + q;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const sessionToken = String(options.token ?? '').trim();
  const method = options.method || 'GET';
  const pathOnly = pathWithQuery.split('?')[0] || '';
  const useQueryToken =
    Boolean(sessionToken) &&
    (method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      (method === 'GET' &&
        (pathOnly === '/wallet' ||
          pathOnly.startsWith('/wallet/') ||
          pathOnly.startsWith('/verify-payment/') ||
          pathOnly.startsWith('/booking/'))));
  if (useQueryToken && !/[?&]access_token=/.test(pathWithQuery)) {
    pathWithQuery += `${pathWithQuery.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(sessionToken)}`;
  }

  const url = `${API_BASE_URL}${pathWithQuery}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken
          ? {
              Authorization: `Bearer ${sessionToken}`,
              'X-Access-Token': sessionToken,
            }
          : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Request timed out (${timeoutMs / 1000}s). Check backend is running and VITE_API_BASE_URL is reachable.`,
        { cause: e }
      );
    }
    throw new Error(e instanceof Error ? e.message : 'Network error', { cause: e });
  } finally {
    clearTimeout(timeoutId);
  }

  const authErrHeader =
    response.status === 401
      ? (response.headers.get('x-auth-error') || response.headers.get('X-Auth-Error') || '').trim()
      : '';

  const rawText = await response.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    parsed = rawText ? { message: rawText.trim().slice(0, 400) } : {};
  }

  const authErrMerged = (typeof parsed.authError === 'string' && parsed.authError.trim()) || authErrHeader || '';

  const isVagueUnauthorized = (s: string) => !s || /^unauthorized$/i.test(s.trim());

  const messageFor401 = (rawFromBody: string, authErr: string): string => {
    const vague = isVagueUnauthorized(rawFromBody);
    const byCode: Record<string, string> = {
      MISSING_TOKEN:
        'Login token did not reach the server. Fix nginx so Authorization and X-Access-Token pass through.',
      SESSION_EXPIRED: 'Session expired. Log in again.',
      USER_NOT_IN_DB: 'This account is not on this server. Use the same API URL you used to sign up.',
      JWT_INVALID_NO_FIREBASE: 'Session not accepted. Log out, log in again.',
      INVALID_PAYLOAD: 'Session invalid. Log in again.',
      INVALID_USER_ID: 'Session invalid. Log in again.',
      JWT_ERROR: 'Session invalid. Log in again.',
      FIREBASE_USER_MISSING: 'Account not found. Log in again.',
    };
    if (authErr && byCode[authErr]) return byCode[authErr];
    if (!vague) return rawFromBody.trim();
    if (authErr) return `Not authorized (${authErr}). Log in again or check server logs.`;
    return 'Not authorized (no details). Log in again.';
  };

  const pickMessage = (d: Record<string, unknown>, status: number, authErr: string): string => {
    if (status === 401) {
      const keys = ['message', 'error', 'detail', 'msg', 'description', 'error_description'] as const;
      let raw = '';
      for (const k of keys) {
        const v = d[k];
        if (typeof v === 'string' && v.trim()) {
          raw = v.trim();
          break;
        }
      }
      return messageFor401(raw, authErr);
    }
    const keys = ['message', 'error', 'detail', 'msg', 'description', 'error_description'] as const;
    for (const k of keys) {
      const v = d[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return `Request failed (HTTP ${status})`;
  };

  if (!response.ok) {
    if (response.status === 401 && sessionToken) {
      clearSession();
      if (typeof window !== 'undefined' && shouldSessionRedirectOn401(window.location.pathname)) {
        window.location.assign('/login?reason=session');
      }
    }
    const bodyForErr = {
      ...parsed,
      ...(authErrMerged && typeof parsed.authError !== 'string' ? { authError: authErrMerged } : {}),
    };
    const msg = pickMessage(bodyForErr, response.status, authErrMerged);
    const err = new Error(msg) as Error & { statusCode?: number; body?: unknown };
    err.statusCode = response.status;
    err.body = bodyForErr;
    throw err;
  }
  return parsed as T;
}
