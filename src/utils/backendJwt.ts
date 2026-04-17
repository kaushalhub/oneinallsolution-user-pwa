export function readBackendJwtUserId(token: string | undefined | null): string | undefined {
  if (!token || typeof token !== 'string') return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { userId?: string };
    return typeof payload.userId === 'string' ? payload.userId : undefined;
  } catch {
    return undefined;
  }
}
