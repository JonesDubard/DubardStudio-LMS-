import { headers } from "next/headers";
import { MarketingHome } from "@/components/marketing/MarketingHome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const subdomain = (await headers()).get("x-tenant-subdomain");

  if (subdomain) {
    return (
      <main>
        <p>Tenant: {subdomain}</p>
        <p>Foundation scaffold running</p>
      </main>
    );
  }

  return <MarketingHome />;
}
