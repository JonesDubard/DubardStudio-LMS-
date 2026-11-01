// US-007.1: create a school through the admin path. provision_tenant() (MIG-0010)
// does the work and writes the success audit row in the same transaction.
import { adminHandler, HttpError } from "../_shared/admin.ts";

// provision_tenant() starts each error message with one of these codes.
const ERRORS: Record<string, number> = {
    not_platform_admin: 403,
    invalid_name: 400,
    invalid_contact: 400,
    invalid_subdomain: 400,
    reserved_subdomain: 400,
    subdomain_taken: 409,
};

export const createSchool = (testDb?: Parameters<typeof adminHandler>[0]["db"]) =>
    adminHandler(
        { scope: "platform", action: "tenant.create", resourceType: "tenant", auditedInDatabase: true, db: testDb },
        async ({ body, adminId, db }) => {
            const fields = ["name", "subdomain", "contact_name", "contact_email"] as const;
            for (const f of fields) {
                if (typeof body[f] !== "string") throw new HttpError(400, "invalid_input", `${f} is required.`);
            }

            const { data, error } = await db.rpc("provision_tenant", {
                p_name: body.name,
                p_subdomain: body.subdomain,
                p_contact_name: body.contact_name,
                p_contact_email: body.contact_email,
                p_actor_id: adminId,
            });
            if (error) {
                const code = error.message.split(":")[0];
                if (code in ERRORS) throw new HttpError(ERRORS[code], code, error.message.slice(code.length + 1).trim());
                throw new Error(`provision_tenant failed: ${error.message}`);
            }

            return { status: 201, body: { tenant_id: data }, resourceId: data, tenantId: data };
        },
    );
