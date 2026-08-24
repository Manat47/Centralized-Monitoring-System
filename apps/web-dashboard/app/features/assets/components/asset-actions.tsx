"use client";

import { Button } from "@/components/ui/button";

import {
  useDeactivateAsset,
  useUpdateAssetStatus,
} from "../api/use-asset-actions";
import type { Asset } from "../types/asset";
import { EditAssetDialog } from "./edit-asset-dialog";
import { AdminOnly } from "@/app/features/auth/components/admin-only";

interface AssetActionsProps {
  asset: Asset;
}

export function AssetActions({ asset }: AssetActionsProps) {
  const statusMutation = useUpdateAssetStatus();
  const deactivateMutation = useDeactivateAsset();

  const isPending = statusMutation.isPending || deactivateMutation.isPending;
  const isDeactivated = asset.status === "DEACTIVATE";

  async function changeStatus(
    status: "ACTIVATE" | "INACTIVATE",
  ): Promise<void> {
    try {
      await statusMutation.mutateAsync({
        assetId: asset.assetId,
        status,
      });
    } catch {
      // แสดง error ด้านล่าง
    }
  }

  async function handleDeactivate(): Promise<void> {
    const confirmed = window.confirm(
      `Deactivate "${asset.name}"? This asset will no longer be active.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deactivateMutation.mutateAsync(asset.assetId);
    } catch {
      // แสดง error ด้านล่าง
    }
  }

  return (
    <AdminOnly>
      <div className="flex flex-col items-end gap-1">
        {isDeactivated ? (
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
            Read-only
          </span>
        ) : (
          <div className="flex flex-nowrap items-center justify-end gap-1">
            <EditAssetDialog asset={asset} />

            {asset.status === "INACTIVATE" && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={isPending}
                onClick={() => void changeStatus("ACTIVATE")}
              >
                {statusMutation.isPending &&
                statusMutation.variables?.assetId === asset.assetId
                  ? "Updating..."
                  : "Activate"}
              </Button>
            )}

            {asset.status === "ACTIVATE" && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={isPending}
                onClick={() => void changeStatus("INACTIVATE")}
              >
                {statusMutation.isPending &&
                statusMutation.variables?.assetId === asset.assetId
                  ? "Updating..."
                  : "Inactivate"}
              </Button>
            )}

            <Button
              type="button"
              size="xs"
              variant="destructive"
              disabled={isPending}
              onClick={() => void handleDeactivate()}
            >
              {deactivateMutation.isPending &&
              deactivateMutation.variables === asset.assetId
                ? "Deactivating..."
                : "Deactivate"}
            </Button>
          </div>
        )}

        {statusMutation.isError && (
          <p className="max-w-80 text-right text-xs text-destructive">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : "Failed to update asset status"}
          </p>
        )}

        {deactivateMutation.isError && (
          <p className="max-w-80 text-right text-xs text-destructive">
            {deactivateMutation.error instanceof Error
              ? deactivateMutation.error.message
              : "Failed to deactivate asset"}
          </p>
        )}
      </div>
    </AdminOnly>
  );
}
