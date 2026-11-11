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
  if (isPublicAsset(path)) return true;

  return false;
}

/**
 * Files the browser must fetch before a session exists.
 * A redirect on `/sw.js` makes the service worker fail to install.
 */
function isPublicAsset(path: string): boolean {
  if (path === "/manifest.webmanifest" || path === "/manifest.json") return true;
  if (path === "/offline.html") return true;
  if (path === "/favicon.ico" || path === "/logo.svg") return true;
  if (path === "/icon.png" || path === "/apple-icon.png") return true;
  if (path === "/sw.js" || path === "/sw.js.map") return true;
  if (path.startsWith("/workbox-") || path.startsWith("/swe-worker-")) return true;
  return false;
}
