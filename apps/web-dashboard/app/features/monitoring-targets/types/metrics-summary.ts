export interface CpuCoreUsage {
  timestamp: string;
  cpu: string;
  usagePercent: number | null;
}

export interface CpuUsageSummary {
  averageUsagePercent: number | null;
  cores: CpuCoreUsage[];
}

export interface MemoryUsageSummary {
  timestamp: string;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number | null;
}

export interface DiskUsageSummary {
  timestamp: string;
  device: string;
  mountpoint: string;
  filesystemType: string;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number | null;
}

export interface NetworkRateSummary {
  timestamp: string;
  device: string;
  receiveBytesPerSecond: number | null;
  transmitBytesPerSecond: number | null;
}

export interface MetricsSummaryPoint {
  assetId: string;
  timestamp: string;
  cpu: CpuUsageSummary;
  memory: MemoryUsageSummary;
  disks: DiskUsageSummary[];
  networks: NetworkRateSummary[];
}

export type MetricsSummaryResponse = MetricsSummaryPoint;
