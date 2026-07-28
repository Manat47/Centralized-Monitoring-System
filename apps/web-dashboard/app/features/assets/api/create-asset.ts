import type { Asset, CreateAssetInput } from "../types/asset";
import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const response = await authenticatedFetch(`${API_GATEWAY_URL}/assets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to create asset: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Asset;
}
