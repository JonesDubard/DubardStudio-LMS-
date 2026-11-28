// US-009 + NF-13: list all schools for a Platform Admin, with status totals.
// Built with adminHandler(): the caller must be an active Platform Admin, and every outcome
// (success, refusal, error) gets an audit_log row. School-level fields only: no contact
// details and no school data.
//
// Request body (all optional):
//   status              trial | active | suspended | cancelled
//   onboarding_status   e.g. provisioning (any value; an unknown one matches nothing)
//   sort                newest (default) | oldest, by created date (then id)
//   page_size, cursor   see _shared/paging.ts (default 20, max 100 rows)
// Answer: { schools: [...], totals: {total, active, trial, suspended, cancelled}, paging: {page_size, next_cursor} }
// The totals count ALL schools. They do not change with the filters or the page.
import { adminHandler, HttpError } from "../_shared/admin.ts";
import { keysetFilter, pageOf, parsePaging } from "../_shared/paging.ts";

const SUBSCRIPTION_STATUSES = ["trial", "active", "suspended", "cancelled"];
const ONBOARDING_FORMAT = /^[a-z][a-z_]{0,39}$/;
// The only columns this function reads from tenants (created_at and id are needed for the cursor).
const COLUMNS = "id, name, subdomain, subscription_status, onboarding_status, created_at";

function optionalString(body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new HttpError(400, `invalid_${key}`, `${key} must be text.`);
  return v;
}

export const listSchools = (
  testDb?: Parameters<typeof adminHandler>[0]["db"],
) =>
  adminHandler(
    { scope: "platform", action: "tenant.list", resourceType: "tenant", db: testDb },
    async ({ body, db }) => {
      const status = optionalString(body, "status");
      if (status !== null && !SUBSCRIPTION_STATUSES.includes(status)) {
        throw new HttpError(400, "invalid_status", `status must be one of: ${SUBSCRIPTION_STATUSES.join(", ")}.`);
      }
      const onboarding = optionalString(body, "onboarding_status");
      if (onboarding !== null && !ONBOARDING_FORMAT.test(onboarding)) {
        throw new HttpError(400, "invalid_onboarding_status", "onboarding_status is not valid.");
      }
      const sort = optionalString(body, "sort") ?? "newest";
      if (sort !== "newest" && sort !== "oldest") {
        throw new HttpError(400, "invalid_sort", "sort must be newest or oldest.");
      }
      const direction = sort as "newest" | "oldest";
      const paging = parsePaging(body, direction);

      // deno-lint-ignore no-explicit-any
      let q: any = db.from("tenants").select(COLUMNS);
      if (status) q = q.eq("subscription_status", status);
      if (onboarding) q = q.eq("onboarding_status", onboarding);
      const after = keysetFilter(paging);
      if (after) q = q.or(after);

      // created_at then id: schools created at the same moment keep a stable order across pages.
      const asc = direction === "oldest";
      const res = await q
        .order("created_at", { ascending: asc })
        .order("id", { ascending: asc })
        .limit(paging.fetchLimit);
      if (res.error) throw new Error(`tenants list failed: ${res.error.message}`);
      const { rows: schools, paging: pageInfo } = pageOf(res.data ?? [], paging);

      const t = await db.rpc("school_status_totals").single();
      if (t.error || !t.data) throw new Error(`school_status_totals failed: ${t.error?.message ?? "no data"}`);
      const counts = t.data as { total: number; active: number; trial: number; suspended: number; cancelled: number };

      return {
        body: {
          schools,
          totals: {
            total: counts.total,
            active: counts.active,
            trial: counts.trial,
            suspended: counts.suspended,
            cancelled: counts.cancelled,
          },
          paging: pageInfo,
        },
        // No cursor here: the audit row holds filters and counts, never school data.
        details: {
          status,
          onboarding_status: onboarding,
          sort,
          page_size: paging.pageSize,
          returned: schools.length,
          has_more: pageInfo.next_cursor !== null,
        },
      };
    },
  );