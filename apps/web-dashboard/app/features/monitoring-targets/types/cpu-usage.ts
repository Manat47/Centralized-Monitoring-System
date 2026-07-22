export interface CpuUsageDataPoint {
  timestamp: string;
  cpu: string;
  usagePercent: number;
}

export type CpuUsageResponse = CpuUsageDataPoint[];
