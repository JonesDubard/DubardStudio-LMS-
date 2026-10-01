import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { isPublicPath } from "@/lib/auth/public-paths";

type PendingCookie = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyPending(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
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
  requestHeaders.delete("x-tenant-id");

  if (!url || !anonKey) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        pendingCookies.push(...cookiesToSet);
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  // Validates the cookie and refreshes it when the access token is due.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return applyPending(
      NextResponse.redirect(redirectUrl),
      pendingCookies,
      pendingHeaders,
    );
  }

  if (user) {
    // getUser() confirms the session. Claims from the access-token hook are
    // on the JWT, not on the user object, so read them from the access token.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      const claims = readAccessTokenClaims(accessToken);
      if (claims.app_role) {
        requestHeaders.set("x-app-role", claims.app_role);
      }
      if (claims.tenantId) {
        requestHeaders.set("x-tenant-id", claims.tenantId);
      }
    }
  }

  return applyPending(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    pendingCookies,
    pendingHeaders,
  );
}
