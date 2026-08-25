import type { Asset } from "@/app/features/assets/types/asset";

import type { HealthCheckTarget } from "../types/health-check";

export type HealthResultStatus = "AVAILABLE" | "UNAVAILABLE" | "STALE" | "UNKNOWN";

export function getHealthResultStatus(target: HealthCheckTarget): HealthResultStatus {
  const latest = target.latest;

  if (!latest) return "UNKNOWN";

  const staleAfterMs = Math.max((target.checkIntervalSeconds * 2 + 5) * 1000, 30_000);
  if (Date.now() - new Date(latest.timestamp).getTime() > staleAfterMs) return "STALE";

  return latest.statusCode !== null && latest.statusCode >= 200 && latest.statusCode < 300
    ? "AVAILABLE"
    : "UNAVAILABLE";
}

export function getHealthRuntimeState(target: HealthCheckTarget, asset?: Asset) {
  if (target.archivedAt) return "ARCHIVED" as const;
  if (asset?.status === "DEACTIVATE") return "RETIRED" as const;
  if (asset?.status === "INACTIVATE") return "PAUSED_BY_ASSET" as const;
  return target.enabled ? ("RUNNING" as const) : ("PAUSED" as const);
}

export function hasOriginMismatch(assetEndpoint: string | null, healthUrl: string): boolean {
  if (!assetEndpoint) return false;

  try {
    return new URL(assetEndpoint).origin !== new URL(healthUrl).origin;
  } catch {
    return false;
  }
}
