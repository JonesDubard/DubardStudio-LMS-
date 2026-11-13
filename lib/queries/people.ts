import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonRole = "teacher" | "student" | "school_admin" | "parent";

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type MembershipRow = { profile_id: string; status: string };
type ProfileRow = { id: string; full_name: string | null; email: string };

/** Active and invited members of one role. Removed memberships are left out. */
export async function listPeople(
  supabase: SupabaseClient,
  role: PersonRole,
  fallbackName: string,
): Promise<PersonRow[]> {
  const membershipResult = await supabase
    .from("memberships")
    .select("profile_id, status")
    .eq("role", role)
    .neq("status", "removed")
    .returns<MembershipRow[]>();
  if (membershipResult.error) {
    throw new Error(`memberships: ${membershipResult.error.message}`);
  }
  const memberships = membershipResult.data ?? [];
  const profileIds = [...new Set(memberships.map((row) => row.profile_id))];
  if (profileIds.length === 0) return [];

  const profileResult = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", profileIds)
    .returns<ProfileRow[]>();
  if (profileResult.error) throw new Error(`profiles: ${profileResult.error.message}`);
  const profileById = new Map((profileResult.data ?? []).map((row) => [row.id, row]));

  return memberships
    .map((membership) => {
      const profile = profileById.get(membership.profile_id);
      return {
        id: membership.profile_id,
        name: profile?.full_name?.trim() || fallbackName,
        email: profile?.email ?? "",
        status: membership.status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
