import type { Asset } from "../types/asset";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function deactivateAsset(assetId: string): Promise<Asset> {
  const response = await fetch(
    `${API_GATEWAY_URL}/assets/${assetId}/deactivate`,
    {
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to deactivate asset: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Asset;
}
