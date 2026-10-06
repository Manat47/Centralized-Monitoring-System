import type { Asset } from "@/app/features/assets/types/asset";

import type { HealthCheckTarget } from "../types/health-check";

export type HealthResultStatus = "AVAILABLE" | "UNAVAILABLE" | "STALE" | "UNKNOWN";

export function getHealthResultStatus(target: HealthCheckTarget): HealthResultStatus {
  const latest = target.latest;

  if (!latest) return "UNKNOWN";

  const staleAfterMs = Math.max(target.checkIntervalSeconds * 3, 60) * 1000;
  const checkedAt = new Date(latest.timestamp).getTime();
  if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > staleAfterMs) return "STALE";

  return latest.error === null &&
    latest.statusCode !== null &&
    Number(latest.statusCode) === Number(target.expectedStatus)
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
