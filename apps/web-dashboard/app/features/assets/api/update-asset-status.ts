import type { Asset, AssetStatus } from "../types/asset";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

interface UpdateAssetStatusVariables {
  assetId: string;
  status: AssetStatus;
}

export async function updateAssetStatus({
  assetId,
  status,
}: UpdateAssetStatusVariables): Promise<Asset> {
  const response = await fetch(`${API_GATEWAY_URL}/assets/${assetId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to update asset status: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Asset;
}
