import { describe, expect, it } from 'vitest';

import { shouldSessionRedirectOn401 } from './authWall';

describe('shouldSessionRedirectOn401', () => {
  it('returns false for onboarding and auth routes', () => {
    expect(shouldSessionRedirectOn401('/')).toBe(false);
    expect(shouldSessionRedirectOn401('/location')).toBe(false);
    expect(shouldSessionRedirectOn401('/onboarding')).toBe(false);
    expect(shouldSessionRedirectOn401('/login')).toBe(false);
    expect(shouldSessionRedirectOn401('/login?x=1')).toBe(false);
    expect(shouldSessionRedirectOn401('/otp')).toBe(false);
    expect(shouldSessionRedirectOn401('/otp/verify')).toBe(false);
  });

  it('returns true for authenticated app surfaces', () => {
    expect(shouldSessionRedirectOn401('/tabs/home')).toBe(true);
    expect(shouldSessionRedirectOn401('/cart')).toBe(true);
    expect(shouldSessionRedirectOn401('/booking')).toBe(true);
  });
});
