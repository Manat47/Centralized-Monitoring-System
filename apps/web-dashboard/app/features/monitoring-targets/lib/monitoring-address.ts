import type { Asset } from "@/app/features/assets/types/asset";

import type {
  MonitoringAddressSource,
  MonitoringTarget,
} from "../types/monitoring-target";

export function getAvailableAddressSources(
  asset: Asset | undefined,
): MonitoringAddressSource[] {
  const sources: MonitoringAddressSource[] = [];

  if (asset?.hostname?.trim()) sources.push("HOSTNAME");
  if (asset?.ipAddress?.trim()) sources.push("IP_ADDRESS");

  return sources;
}

export function getAddressForSource(
  asset: Asset | undefined,
  source: MonitoringAddressSource | null | undefined,
): string {
  if (source === "HOSTNAME") return asset?.hostname?.trim() || "";
  if (source === "IP_ADDRESS") return asset?.ipAddress?.trim() || "";

  return asset?.hostname?.trim() || asset?.ipAddress?.trim() || "";
}

export function getEffectiveAddressSource(
  target: MonitoringTarget,
  asset: Asset | undefined,
): MonitoringAddressSource | null {
  if (target.addressSource) return target.addressSource;
  if (asset?.hostname?.trim()) return "HOSTNAME";
  if (asset?.ipAddress?.trim()) return "IP_ADDRESS";
  return null;
}

export function getNodeExporterUrl(
  target: Pick<MonitoringTarget, "protocol" | "port" | "path">,
  asset: Asset | undefined,
  source: MonitoringAddressSource | null | undefined,
): string {
  const address = getAddressForSource(asset, source);

  if (!target.protocol || !address) return "";

  return `${target.protocol.toLowerCase()}://${address}:${target.port}${target.path}`;
}
