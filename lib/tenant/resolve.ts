const LOCAL_ROOT = "localhost";

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function labelBeforeRoot(host: string, root: string): string | null | undefined {
  if (!root) return undefined;
  if (host === root || host === `www.${root}`) return null;

  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) return undefined;

  const prefix = host.slice(0, -suffix.length);
  if (!prefix || prefix.includes(".")) return null;
  if (prefix === "www") return null;

  return prefix;
}

/**
 * Returns the tenant subdomain for a hostname, or null for the root site.
 * A tenant host is exactly one label in front of NEXT_PUBLIC_ROOT_DOMAIN.
 * `www` is treated as the root site. `localhost` is also a root so local
 * hosts such as pilotschool.localhost resolve during development.
 */
export function resolveTenantSubdomain(hostname: string): string | null {
  const host = normalizeHostname(hostname);
  if (!host) return null;

  const configured = normalizeHostname(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "");
  const roots =
    configured && configured !== LOCAL_ROOT
      ? [configured, LOCAL_ROOT]
      : [LOCAL_ROOT];

  for (const root of roots) {
    const label = labelBeforeRoot(host, root);
    if (label !== undefined) return label;
  }

  return null;
}
