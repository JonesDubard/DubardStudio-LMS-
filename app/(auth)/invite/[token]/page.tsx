import { headers } from "next/headers";
import { InviteForm } from "@/components/auth/InviteForm";
import { lookupInvite } from "@/lib/auth/invite";
import { inviteErrorMessage, inviteRoleLabel } from "@/lib/auth/invite-errors";
import { createClient } from "@/lib/supabase/server";
import { alertError } from "@/lib/ui/styles";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await lookupInvite(token);

  if (!invite.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Accept invitation</h1>
        <p role="alert" className={alertError}>
          {inviteErrorMessage(invite.code)}
        </p>
      </div>
    );
  }

  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain && subdomain !== invite.schoolSubdomain) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Accept invitation</h1>
        <p role="alert" className={alertError}>
          {inviteErrorMessage("wrong_address")}
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <InviteForm
      token={token}
      schoolName={invite.schoolName}
      roleLabel={inviteRoleLabel(invite.role)}
      email={invite.email}
      signedInEmail={data.user?.email?.toLowerCase() ?? null}
    />
  );
}
