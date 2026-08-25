"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMetricRules } from "@/app/features/metric-rules/api/use-metric-rules";
import type { MetricRuleType } from "@/app/features/metric-rules/types/metric-rule";

import { CpuUsageChart } from "./cpu-usage-chart";
import { MemoryUsageChart } from "./memory-usage-chart";
import { DiskUsageChart } from "./disk-usage-chart";
import { NetworkRateChart } from "./network-rate-chart";
import type { MetricThreshold } from "./metric-chart-utils";

const TIME_RANGES = [
  { label: "Last 30 minutes", value: "30" },
  { label: "Last 1 hour", value: "60" },
  { label: "Last 6 hours", value: "360" },
  { label: "Last 24 hours", value: "1440" },
] as const;

export function AssetMetricsSummary() {
  const params = useParams<{ assetId: string }>();
  const [rangeMinutes, setRangeMinutes] = useState("60");
  const metricRulesQuery = useMetricRules();

  const getThresholds = (metricType: MetricRuleType): MetricThreshold[] =>
    (metricRulesQuery.data ?? [])
      .filter(
        (rule) =>
          rule.assetId === params.assetId &&
          rule.metricType === metricType &&
          rule.enabled,
      )
      .map((rule) => ({
        id: rule.ruleId,
        value: rule.thresholdValue,
        severity: rule.severity,
      }));

  const selectedRange = Number(rangeMinutes);

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

          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CpuUsageChart
        assetId={params.assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("CPU_USAGE")}
      />

      <MemoryUsageChart
        assetId={params.assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("MEMORY_USAGE")}
      />

      <DiskUsageChart
        assetId={params.assetId}
        rangeMinutes={selectedRange}
        thresholds={getThresholds("DISK_USAGE")}
      />

      <NetworkRateChart
        assetId={params.assetId}
        rangeMinutes={selectedRange}
      />
    </section>
  );
}
