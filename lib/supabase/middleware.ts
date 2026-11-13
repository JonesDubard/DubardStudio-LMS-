import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { isPublicPath } from "@/lib/auth/public-paths";
import { checkSchoolMatch } from "@/lib/auth/school-guard";
import { allowsRootMarketing } from "@/lib/marketing/paths";
import { lookupSchool, type SchoolLookup } from "@/lib/tenant/lookup";

type PendingCookie = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function applyPending(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  cookies.forEach(({ name, value, options }) => {
    try {
      response.cookies.set(name, value, options);
    } catch {
      console.error("Could not write the session cookie.");
    }
  });
  Object.entries(headers).forEach(([key, value]) => {
    try {
      response.headers.set(key, value);
    } catch {
      console.error("Could not write a session header.");
    }
  });
  return response;
}

function finish(
  request: NextRequest,
  requestHeaders: Headers,
  user: { id: string } | null,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  const marketingOnRoot = allowsRootMarketing(
    request.nextUrl.pathname,
    requestHeaders.get("x-tenant-subdomain"),
  );

  if (!user && !isPublicPath(request.nextUrl.pathname) && !marketingOnRoot) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return applyPending(NextResponse.redirect(redirectUrl), cookies, headers);
  }

  return applyPending(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    cookies,
    headers,
  );
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Drop client-supplied values so pages only see claims this middleware sets.
  requestHeaders.delete("x-app-role");
  requestHeaders.delete("x-app-roles");
  requestHeaders.delete("x-tenant-id");

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  let user: { id: string } | null = null;

  if (url && !isHttpUrl(url)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }

  if (!url || !anonKey || !isHttpUrl(url)) {
    return finish(request, requestHeaders, null, pendingCookies, pendingHeaders);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          try {
            request.cookies.set(name, value);
          } catch {
            console.error("Could not store the refreshed session cookie.");
          }
        });
        pendingCookies.push(...cookiesToSet);
        if (headers) Object.assign(pendingHeaders, headers);
      },
    },
  });

  // US-002.1: which school does this address belong to? middleware.ts sets
  // x-tenant-subdomain from the hostname; it's null on the root address, which
  // isn't checked here. Kept outside the session try/catch below on purpose:
  // that one lets the site stay up when refresh fails, but if we can't tell
  // which school this is, we must not serve the school's pages (fail closed).
  const subdomain = requestHeaders.get("x-tenant-subdomain");
  let school: SchoolLookup | null = null;
  if (subdomain) {
    try {
      school = await lookupSchool(supabase, subdomain);
    } catch {
      console.error("Could not look up the school for this address.");
      return new NextResponse("school_lookup_failed", { status: 503 });
    }
    if (school.kind === "not_found") {
      return new NextResponse("not_found", { status: 404 });
    }
  }

  let tokenTenantId: string | null = null;
  try {
    // Validates the cookie and refreshes it when the access token is due.
    // A suspended or cancelled school fails the refresh (0010 login hook),
    // so the user comes back as signed out.
    const { data: userData } = await supabase.auth.getUser();
    user = userData.user;

    if (user) {
      // getUser() confirms the session. Claims from the access-token hook are
      // on the JWT, not on the user object, so read them from the access token.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const claims = readAccessTokenClaims(accessToken);
        tokenTenantId = claims.tenantId;
        if (claims.app_roles.length > 0) {
          requestHeaders.set("x-app-roles", claims.app_roles.join(","));
        }
        if (claims.tenantId) {
          requestHeaders.set("x-tenant-id", claims.tenantId);
        }
      }
    }
  } catch {
    console.error("Could not refresh the session.");
    user = null;
    tokenTenantId = null;
    requestHeaders.delete("x-app-role");
    requestHeaders.delete("x-app-roles");
    requestHeaders.delete("x-tenant-id");
  }

  // A token with no school (Platform Admin, no active membership) is refused too.
  if (user && school && checkSchoolMatch(school, tokenTenantId) !== "allow") {
    try {
      // "local" ends only this browser's session. The default ("global")
      // would also sign them out of their own school on other devices.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      console.error("Could not sign out a user on the wrong school's address.");
    }
    requestHeaders.delete("x-app-roles");
    requestHeaders.delete("x-tenant-id");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "?error=wrong_school";
    return applyPending(
      NextResponse.redirect(redirectUrl),
      pendingCookies,
      pendingHeaders,
    );
  }

  return finish(request, requestHeaders, user, pendingCookies, pendingHeaders);
}