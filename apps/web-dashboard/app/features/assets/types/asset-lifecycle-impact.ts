import type { AssetStatus } from "./asset";

export type AssetLifecycleAction = AssetStatus;
export type LifecycleResourceEffect = "NONE" | "RESUME" | "PAUSE" | "STOP";
export type LifecycleAlertEffect = "UNCHANGED" | "RETAIN" | "RESOLVE";

export interface LifecycleResourceImpact {
  configured: number;
  enabled: number;
  effect: LifecycleResourceEffect;
}

export interface AssetLifecycleImpact {
  assetId: string;
  assetName: string;
  currentStatus: AssetStatus;
  targetStatus: AssetStatus;
  terminal: boolean;
  readOnlyAfter: boolean;
  resources: {
    monitoringTargets: LifecycleResourceImpact;
    healthChecks: LifecycleResourceImpact;
    metricRules: LifecycleResourceImpact;
  };
  alerts: {
    triggered: number;
    acknowledged: number;
    total: number;
    effect: LifecycleAlertEffect;
    resolutionIsAsynchronous: boolean;
  };
  historyPreserved: true;
}
