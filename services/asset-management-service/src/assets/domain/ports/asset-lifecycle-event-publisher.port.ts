export interface AssetLifecycleEvent {
  eventType: 'ASSET_DEACTIVATED';
  assetId: string;
  occurredAt: Date;
}

export const ASSET_LIFECYCLE_EVENT_PUBLISHER = Symbol(
  'ASSET_LIFECYCLE_EVENT_PUBLISHER',
);

export interface AssetLifecycleEventPublisher {
  publish(event: AssetLifecycleEvent): Promise<void>;
}
