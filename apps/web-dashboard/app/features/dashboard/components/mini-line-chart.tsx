"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

interface MiniChartSeries {
  name: string;
  data: [string, number][];
  color?: string;
}

interface MiniLineChartProps {
  series: MiniChartSeries[];
  unit?: string;
  min?: number;
  max?: number;
  height?: number;
  area?: boolean;
  valueFormatter?: (value: number) => string;
}

export function MiniLineChart({
  series,
  unit = "",
  min,
  max,
  height = 150,
  area = false,
  valueFormatter,
}: MiniLineChartProps) {
  const hasData = series.some((item) => item.data.length > 0);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-slate-50 text-xs text-slate-400"
        style={{ height }}
      >
        No metrics collected
      </div>
    );
  }

  const formatValue = (value: number) => {
    if (valueFormatter) {
      return valueFormatter(value);
    }

    if (unit === "%") {
      return `${value.toFixed(1)}%`;
    }

    return `${value.toFixed(2)}${unit}`;
  };

  const option: EChartsOption = {
    animation: false,

    tooltip: {
      trigger: "axis",
      backgroundColor: "#ffffff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      textStyle: {
        color: "#334155",
        fontSize: 11,
      },
      extraCssText:
        "box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); border-radius: 8px;",
      valueFormatter: (value) => formatValue(Number(value)),
    },

    grid: {
      left: 8,
      right: 8,
      top: 8,
      bottom: 24,
      containLabel: true,
    },

    xAxis: {
      type: "time",

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#94a3b8",
        fontSize: 9,
        hideOverlap: true,
      },

      splitLine: {
        show: false,
      },
    },

    yAxis: {
      type: "value",
      min,
      max,

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },

      axisLabel: {
        color: "#94a3b8",
        fontSize: 9,
        formatter: (value: number) =>
          unit === "%" ? `${Math.round(value)}%` : formatValue(value),
      },

      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
          type: "dashed",
          opacity: 0.7,
        },
      },
    },

    series: series.map((item) => ({
      name: item.name,
      type: "line",
      smooth: 0.25,
      showSymbol: false,
      symbol: "circle",

      emphasis: {
        focus: "series",
      },

      lineStyle: {
        width: 2,
        color: item.color,
      },

      itemStyle: {
        color: item.color,
      },

      areaStyle: area
        ? {
            color: item.color,
            opacity: 0.08,
          }
        : undefined,

      data: item.data,
    })),
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{
        width: "100%",
        height,
      }}
    />
  );
}
