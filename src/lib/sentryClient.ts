import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || typeof dsn !== 'string' || !dsn.trim()) return;
  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0.08,
  });
}

export function captureClientException(error: Error, extra?: Record<string, unknown>): void {
  if (
    !import.meta.env.PROD ||
    typeof import.meta.env.VITE_SENTRY_DSN !== 'string' ||
    !import.meta.env.VITE_SENTRY_DSN.trim()
  ) {
    return;
  }
  Sentry.captureException(error, { extra });
}
