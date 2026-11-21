import { createAdminClient } from "@/lib/supabase/admin";
import type { InviteErrorCode } from "@/lib/auth/invite-errors";
import { inviteErrorCode } from "@/lib/auth/invite-errors";

export type InviteLookup =
    | {
        ok: true;
        invitationId: string;
        tenantId: string;
        schoolName: string;
        schoolSubdomain: string;
        email: string;
        role: string;
    }
    | { ok: false; code: InviteErrorCode };

type CheckRow = {
    invitation_id: string | null;
    tenant_id: string | null;
    school_name: string | null;
    school_subdomain: string | null;
    email: string | null;
    role: string | null;
    problem: string | null;
};

export async function lookupInvite(token: string): Promise<InviteLookup> {
    const admin = createAdminClient();
    const result = await admin.rpc("check_invitation", { p_token: token });
    if (result.error)
        throw new Error(`check_invitation: ${result.error.message}`);

    const row = ((result.data ?? []) as CheckRow[])[0];
    if (!row) return { ok: false, code: "invite_unknown" };
    if (row.problem)
        return {
            ok: false,
            code: inviteErrorCode(row.problem) ?? "invite_unknown",
        };
    if (
        !row.invitation_id ||
        !row.tenant_id ||
        !row.school_name ||
        !row.school_subdomain ||
        !row.email ||
        !row.role
    ) {
        return { ok: false, code: "invite_unknown" };
    }

    return {
        ok: true,
        invitationId: row.invitation_id,
        tenantId: row.tenant_id,
        schoolName: row.school_name,
        schoolSubdomain: row.school_subdomain,
        email: row.email.trim().toLowerCase(),
        role: row.role,
    };
}
