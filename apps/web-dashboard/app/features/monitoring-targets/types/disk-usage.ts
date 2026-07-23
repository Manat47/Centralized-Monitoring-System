export interface DiskUsageDataPoint {
  timestamp: string;
  device: string;
  mountpoint: string;
  filesystemType: string;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number;
}

export type DiskUsageResponse = DiskUsageDataPoint[];
