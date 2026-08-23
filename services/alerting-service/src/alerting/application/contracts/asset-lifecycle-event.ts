export interface AssetLifecycleEvent {
  eventType: 'ASSET_DEACTIVATED';
  assetId: string;
  occurredAt: string;
}
