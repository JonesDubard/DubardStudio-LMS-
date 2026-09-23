import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantSubdomain } from "@/lib/tenant/resolve";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;
  const subdomain = resolveTenantSubdomain(hostname);
  const requestHeaders = new Headers(request.headers);

  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  } else {
    requestHeaders.delete("x-tenant-subdomain");
  }

  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
