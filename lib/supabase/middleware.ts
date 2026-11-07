import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { isPublicPath } from "@/lib/auth/public-paths";
import { checkSchoolMatch } from "@/lib/auth/school-guard";
import { lookupSchool, type SchoolLookup } from "@/lib/tenant/lookup";

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
  // A suspended or cancelled school fails the refresh here (0010 login hook),
  // so the user comes back as signed out.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  // US-002.1: which school does this address belong to? Set by middleware.ts
  // from the hostname. Null on the plain root address, which isn't checked here.
  const subdomain = requestHeaders.get("x-tenant-subdomain");
  let school: SchoolLookup | null = null;
  if (subdomain) {
    try {
      school = await lookupSchool(supabase, subdomain);
    } catch {
      // Fail closed: if we can't tell which school this is, don't serve it.
      return applyPending(
        new NextResponse("school_lookup_failed", { status: 503 }),
        pendingCookies,
        pendingHeaders,
      );
    }
    if (school.kind === "not_found") {
      return applyPending(
        new NextResponse("not_found", { status: 404 }),
        pendingCookies,
        pendingHeaders,
      );
    }
  }

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
    const claims = accessToken ? readAccessTokenClaims(accessToken) : null;

    // US-002.2: a signed-in user may only use their own school's address.
    if (school && checkSchoolMatch(school, claims?.tenantId ?? null) !== "allow") {
      // "local" ends only this browser's session. The default ("global")
      // would also sign them out of their own school on other devices.
      await supabase.auth.signOut({ scope: "local" });
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "?error=wrong_school";
      return applyPending(
        NextResponse.redirect(redirectUrl),
        pendingCookies,
        pendingHeaders,
      );
    }

    if (claims?.app_role) {
      requestHeaders.set("x-app-role", claims.app_role);
    }
    if (claims?.tenantId) {
      requestHeaders.set("x-tenant-id", claims.tenantId);
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
