// US-002.2: may this signed-in user use this school's address?
// A pure function, so the rule is tested without Supabase.
// Suspended and cancelled schools never get this far: the 0010 login hook
// refuses login and token refresh with school_suspended / school_cancelled.

import type { SchoolLookup } from "@/lib/tenant/lookup";

export type SchoolCheck = "allow" | "wrong_school" | "not_found";

export function checkSchoolMatch(
    school: SchoolLookup,
    tokenTenantId: string | null,
): SchoolCheck {
    if (school.kind === "not_found") return "not_found";
    // No tenant_id in the token: a Platform Admin, or a user with no active
    // membership. Neither belongs to this school.
    if (!tokenTenantId) return "wrong_school";
    return tokenTenantId === school.tenantId ? "allow" : "wrong_school";
}
