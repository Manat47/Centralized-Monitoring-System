"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMetricRules } from "@/app/features/metric-rules/api/use-metric-rules";
import { useAssets } from "@/app/features/assets/api/use-assets";
import type { MetricRuleType } from "@/app/features/metric-rules/types/metric-rule";

import { CpuUsageChart } from "./cpu-usage-chart";
import { MemoryUsageChart } from "./memory-usage-chart";
import { DiskUsageChart } from "./disk-usage-chart";
import { NetworkRateChart } from "./network-rate-chart";
import type { MetricThreshold } from "./metric-chart-utils";

const TIME_RANGES = [
  { label: "1 Hour", value: "60" },
  { label: "24 Hours", value: "1440" },
  { label: "7 Days", value: "10080" },
  { label: "All Data", value: "all" },
] as const;

export function AssetMetricsSummary({ assetId: selectedAssetId, assetCreatedAt }: { assetId?: string; assetCreatedAt?: string } = {}) {
  const params = useParams<{ assetId: string }>();
  const assetId = selectedAssetId ?? params.assetId;
  const [rangeMinutes, setRangeMinutes] = useState("60");
  const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());
  useEffect(() => {
    if (rangeMinutes !== "all") return;
    const timer = window.setInterval(() => setRangeAnchor(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [rangeMinutes]);
  const metricRulesQuery = useMetricRules();
  const assetsQuery = useAssets();
  const createdAt = assetCreatedAt ?? assetsQuery.data?.find((asset) => asset.assetId === assetId)?.createdAt;

  const getThresholds = (metricType: MetricRuleType): MetricThreshold[] =>
    (metricRulesQuery.data ?? [])
      .filter(
        (rule) =>
          rule.assetId === assetId &&
          rule.metricType === metricType &&
          rule.enabled,
      )
      .flatMap((rule) => [
        { id: `${rule.ruleId}-warning`, value: rule.warningThreshold, severity: "WARNING" as const },
        { id: `${rule.ruleId}-critical`, value: rule.criticalThreshold, severity: "CRITICAL" as const },
      ]);

  const selectedRange = rangeMinutes === "all" && createdAt
    ? Math.max(1, Math.ceil((rangeAnchor - Date.parse(createdAt)) / 60_000))
    : rangeMinutes === "all" ? 60 : Number(rangeMinutes);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-slate-500">Time range</span>

        <Select
          value={rangeMinutes}
          onValueChange={(value) => value && setRangeMinutes(value)}
        >
          <SelectTrigger className="h-9 w-44 bg-white">
            <SelectValue>
              {TIME_RANGES.find((range) => range.value === rangeMinutes)?.label}
            </SelectValue>
          </SelectTrigger>

          <SelectContent
            alignItemWithTrigger={false}
            sideOffset={6}
            className="duration-150"
          >
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CpuUsageChart
        assetId={assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("CPU_USAGE")}
      />

      <MemoryUsageChart
        assetId={assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("MEMORY_USAGE")}
      />

      <DiskUsageChart
        assetId={assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("DISK_USAGE")}
      />

      <NetworkRateChart assetId={assetId} rangeMinutes={selectedRange} />
    </section>
  );
}
