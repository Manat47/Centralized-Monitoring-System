const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface InvitationDetails {
  email: string;
  displayName: string;
  expiresAt: string;
}

async function getError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (Array.isArray(body?.message)) return body.message.join(", ");
  return body?.message ?? fallback;
}

export async function validateInvitation(
  token: string,
): Promise<InvitationDetails> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/invitations/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(await getError(response, "Invitation is invalid or expired"));
  }

  return (await response.json()) as InvitationDetails;
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<{ email: string }> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/invitations/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    throw new Error(await getError(response, "Unable to set password"));
  }

  return (await response.json()) as { email: string };
}
