import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { isPublicPath } from "@/lib/auth/public-paths";
import { allowsRootMarketing } from "@/lib/marketing/paths";

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

  if (!url || !anonKey) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!isHttpUrl(url)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  let user: { id: string } | null = null;

  try {
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

    // Validates the cookie and refreshes it when the access token is due.
    const { data: userData } = await supabase.auth.getUser();
    user = userData.user;

    if (user) {
      // getUser() confirms the session. Claims from the access-token hook are
      // on the JWT, not on the user object, so read them from the access token.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const claims = readAccessTokenClaims(accessToken);
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
    requestHeaders.delete("x-app-role");
    requestHeaders.delete("x-app-roles");
    requestHeaders.delete("x-tenant-id");
  }

  const marketingOnRoot = allowsRootMarketing(
    request.nextUrl.pathname,
    requestHeaders.get("x-tenant-subdomain"),
  );

  if (!user && !isPublicPath(request.nextUrl.pathname) && !marketingOnRoot) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return applyPending(
      NextResponse.redirect(redirectUrl),
      pendingCookies,
      pendingHeaders,
    );
  }

  return applyPending(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    pendingCookies,
    pendingHeaders,
  );
}
