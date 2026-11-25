import type { Rpc } from "@/lib/invitations/sendInvite";

export type RemoveResult = { ok: true } | { ok: false; code: string };

export async function removeSchoolAdmin(
  actorId: string,
  tenantId: string,
  profileId: string,
  deps: { db: Rpc },
): Promise<RemoveResult> {
  const res = await deps.db.rpc("remove_school_admin", {
    p_tenant_id: tenantId, // exactly one school
    p_profile_id: profileId,
    p_actor_id: actorId,
  });
  if (res.error) {
    const m = /^([a-z_]+)/.exec(res.error.message);
    return { ok: false, code: m?.[1] ?? "remove_failed" };
  }
  if (res.data !== true) return { ok: false, code: "remove_failed" };
  return { ok: true };
}

export function removeSchoolAdminError(code: string): string {
  switch (code) {
    case "last_school_admin":
      return "This is the school's last active School Admin, so they can't be removed.";
    case "admin_not_found":
      return "That School Admin was not found at this school. They may have been removed already.";
    case "not_allowed":
      return "You can't remove School Admins of this school.";
    default:
      return "The School Admin was not removed.";
  }
}
