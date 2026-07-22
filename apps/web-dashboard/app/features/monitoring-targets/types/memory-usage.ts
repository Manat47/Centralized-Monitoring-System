export interface MemoryUsageDataPoint {
  timestamp: string;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number;
}

export type MemoryUsageResponse = MemoryUsageDataPoint[];
