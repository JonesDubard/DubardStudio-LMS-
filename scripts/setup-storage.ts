/**
 * One-time private Storage bucket and tenant path policy.
 * Do not call this from seed or from the app. Run it once by hand:
 *   npx tsx scripts/setup-storage.ts
 *
 * Requires 0005a_files.sql to be applied first if you also want the
 * files table. The bucket itself does not depend on that table.
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const BUCKET = "tenant-files";

const POLICY_CHECK = `
bucket_id = '${BUCKET}'
AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
`.trim();

export const TENANT_FILES_POLICY_SQL = [
  `DROP POLICY IF EXISTS tenant_files_isolation ON storage.objects`,
  `CREATE POLICY tenant_files_isolation ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    ${POLICY_CHECK}
  )
  WITH CHECK (
    ${POLICY_CHECK}
  )`,
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return value;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await admin.storage.getBucket(BUCKET);
  if (existing.error && !/not found/i.test(existing.error.message)) {
    throw existing.error;
  }

  if (existing.data) {
    console.log(`Bucket "${BUCKET}" already exists (private).`);
  } else {
    const created = await admin.storage.createBucket(BUCKET, {
      public: false,
    });
    if (created.error) throw created.error;
    console.log(`Created private bucket "${BUCKET}".`);
  }

  for (const statement of TENANT_FILES_POLICY_SQL) {
    const policy = await admin.rpc("auth_spike_exec", { statement });
    if (policy.error) {
      console.error("Could not install the storage policy through auth_spike_exec.");
      console.error(policy.error.message);
      console.error("");
      console.error("Paste this SQL in the Supabase SQL editor instead:");
      console.error(TENANT_FILES_POLICY_SQL.join(";\n") + ";");
      process.exitCode = 1;
      return;
    }
  }

  console.log("Storage policy tenant_files_isolation is installed.");
  console.log("Object names must start with the tenant id: {tenant_id}/...");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
