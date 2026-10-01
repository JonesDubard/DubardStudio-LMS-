import { InviteForm } from "@/components/auth/InviteForm";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteForm token={token} />;
}
