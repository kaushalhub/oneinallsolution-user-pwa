/**
 * When an authenticated API call returns 401, we clear the session and redirect to login.
 * Do not redirect on auth onboarding routes — those may legitimately receive 401 without a session.
 */
export function shouldSessionRedirectOn401(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').toLowerCase();
  if (
    path === '/' ||
    path === '/location' ||
    path === '/onboarding' ||
    path === '/login' ||
    path === '/otp' ||
    path === '/tabs/home'
  ) {
    return false;
  }
  if (path.startsWith('/login')) return false;
  if (path.startsWith('/otp')) return false;
  if (path.startsWith('/service/')) return false;
  if (path.startsWith('/category/')) return false;
  if (path === '/cart' || path === '/booking') return false;
  return true;
}
