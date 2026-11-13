const ROOT_MARKETING_PATHS = new Set(["/", "/contact", "/access"]);

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Public marketing routes. These are not public on a tenant host. */
export function isRootMarketingPath(pathname: string): boolean {
  return ROOT_MARKETING_PATHS.has(normalizePath(pathname));
}

/**
 * Root-domain visitors can open the marketing site without a session.
 * A tenant subdomain keeps the existing login redirect.
 */
export function allowsRootMarketing(
  pathname: string,
  subdomain: string | null | undefined,
): boolean {
  return !subdomain && isRootMarketingPath(pathname);
}
