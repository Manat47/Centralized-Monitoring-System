export type ServiceStatus = "UP" | "DOWN";

export interface ServiceHealthResult {
  name: string;
  status: ServiceStatus;
  responseTimeMs: number | null;
  error: string | null;
}

export interface SystemStatusResponse {
  status: "HEALTHY" | "DEGRADED";
  checkedAt: string;
  services: ServiceHealthResult[];
}
