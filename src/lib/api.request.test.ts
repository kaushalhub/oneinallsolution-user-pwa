import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSession } from './session';

vi.mock('./session', () => ({
  clearSession: vi.fn(),
  saveSession: vi.fn(),
  getSession: vi.fn(),
}));

const assignMock = vi.fn();

describe('apiRequest', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses JSON body on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ message: 'ok', value: 42 }),
      })
    );
    const { apiRequest } = await import('./api');
    const r = await apiRequest<{ value: number }>('/x');
    expect(r.value).toBe(42);
  });

  it('on 401 with token clears session and redirects from app routes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => '' },
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      })
    );
    vi.stubGlobal('location', {
      pathname: '/cart',
      href: 'http://localhost/cart',
      assign: assignMock,
      replace: vi.fn(),
    } as unknown as Location);

    const { apiRequest } = await import('./api');
    await expect(apiRequest('/cart', { token: 'expired-token' })).rejects.toThrow();
    expect(vi.mocked(clearSession)).toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('/login?reason=session');
  });

  it('on 401 with token does not redirect from /login', async () => {
    assignMock.mockClear();
    vi.mocked(clearSession).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => '' },
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      })
    );
    vi.stubGlobal('location', {
      pathname: '/login',
      href: 'http://localhost/login',
      assign: assignMock,
      replace: vi.fn(),
    } as unknown as Location);

    const { apiRequest } = await import('./api');
    await expect(apiRequest('/user/update', { token: 'x', method: 'PUT', body: {} })).rejects.toThrow();
    expect(vi.mocked(clearSession)).toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
