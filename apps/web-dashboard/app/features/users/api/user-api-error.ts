export async function getUserApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (Array.isArray(body?.message)) {
    return body.message.join(", ");
  }

  return body?.message ?? fallback;
}
