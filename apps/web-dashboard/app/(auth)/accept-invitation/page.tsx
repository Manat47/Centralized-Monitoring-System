import { AcceptInvitationForm } from "@/app/features/auth/components/accept-invitation-form";

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const { token = "" } = await searchParams;
  return <AcceptInvitationForm token={token} />;
}
