export interface NetworkRateDataPoint {
  timestamp: string;
  device: string;
  receiveBytesPerSecond: number;
  transmitBytesPerSecond: number;
}

export type NetworkRateResponse = NetworkRateDataPoint[];
