/**
 * Routes that skip the login redirect. Everything else requires a session.
 * Role checks are intentionally not here — this spike only proves the JWT claim.
 */
export function isPublicPath(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (path === "/login") return true;
  if (path === "/invite" || path.startsWith("/invite/")) return true;
  if (path === "/reset" || path.startsWith("/reset/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (path === "/api/health") return true;

  return false;
}
