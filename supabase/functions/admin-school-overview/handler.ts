import { adminHandler, HttpError } from "../_shared/admin.ts";

const ROLES = ["school_admin", "teacher", "student", "parent"] as const;

export const schoolOverview = (testDb?: Parameters<typeof adminHandler>[0]["db"]) =>
    adminHandler(
        { scope: "one_school", action: "tenant.view_overview", resourceType: "tenant", db: testDb },
        async ({ school }) => {
            const { data: tenant, error } = await school
                .select("tenants", "id, name, subdomain, subscription_status, onboarding_status, created_at")
                .single();
            if (error) throw new Error(`tenant read failed: ${error.message}`);
            if (!tenant) throw new HttpError(404, "school_not_found");

            const active_members: Record<string, number> = {};
            for (const role of ROLES) {
                const { count, error: e } = await school
                    .select("memberships", "id", { count: "exact", head: true })
                    .eq("role", role)
                    .eq("status", "active");
                if (e) throw new Error(`memberships count failed: ${e.message}`);
                active_members[role] = count ?? 0;
            }

            return { body: { school: tenant, active_members }, resourceId: school.tenantId };
        },
    );
