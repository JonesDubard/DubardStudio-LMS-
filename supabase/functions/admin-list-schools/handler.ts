// US-009: list all schools for a Platform Admin, with status totals.
// Built with adminHandler(): the caller must be an active Platform Admin, and every outcome
// (success, refusal, error) gets an audit_log row. School-level fields only: no contact
// details and no school data.
//
// Request body (all optional):
//   status              trial | active | suspended | cancelled
//   onboarding_status   e.g. provisioning (any value; an unknown one matches nothing)
//   sort                newest (default) | oldest, by created date
//   page, page_size     see _shared/paging.ts (max 100 rows)
// Answer: { schools: [...], totals: {total, active, trial, suspended, cancelled}, paging }
// The totals count ALL schools. They do not change with the filters or the page.
import { adminHandler, HttpError } from "../_shared/admin.ts";
import { pageOf, parsePaging } from "../_shared/paging.ts";

const SUBSCRIPTION_STATUSES = ["trial", "active", "suspended", "cancelled"];
const ONBOARDING_FORMAT = /^[a-z][a-z_]{0,39}$/;
// The only columns this function reads from tenants.
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
      const paging = parsePaging(body);

      const filtered = () => {
        // deno-lint-ignore no-explicit-any
        const apply = (q: any) => {
          if (status) q = q.eq("subscription_status", status);
          if (onboarding) q = q.eq("onboarding_status", onboarding);
          return q;
        };
        return apply;
      };
      const apply = filtered();

      // Count first, so a page past the end is an empty page, not a database error.
      const counted = await apply(db.from("tenants").select("id", { count: "exact", head: true }));
      if (counted.error) throw new Error(`tenants count failed: ${counted.error.message}`);
      const total: number = counted.count ?? 0;

      let schools: unknown[] = [];
      if (paging.from < total) {
        // id as the second sort key: schools created at the same moment keep a stable order across pages.
        const asc = sort === "oldest";
        const page = await apply(db.from("tenants").select(COLUMNS))
          .order("created_at", { ascending: asc })
          .order("id", { ascending: asc })
          .range(paging.from, paging.to);
        if (page.error) throw new Error(`tenants list failed: ${page.error.message}`);
        schools = page.data ?? [];
      }

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
          paging: pageOf(total, paging),
        },
        details: {
          status,
          onboarding_status: onboarding,
          sort,
          page: paging.page,
          page_size: paging.pageSize,
          returned: schools.length,
        },
      };
    },
  );