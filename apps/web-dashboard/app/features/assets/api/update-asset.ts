import type { Asset, UpdateAssetInput } from "../types/asset";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

interface UpdateAssetVariables {
  assetId: string;
  input: UpdateAssetInput;
}

export async function updateAsset({
  assetId,
  input,
}: UpdateAssetVariables): Promise<Asset> {
  const response = await fetch(`${API_GATEWAY_URL}/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to update asset: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Asset;
}
