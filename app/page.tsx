import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const headerStore = await headers();
  const subdomain = headerStore.get("x-tenant-subdomain");

  return (
    <main>
      <p>Tenant: {subdomain || "root"}</p>
      <p>Foundation scaffold running</p>
    </main>
  );
}
