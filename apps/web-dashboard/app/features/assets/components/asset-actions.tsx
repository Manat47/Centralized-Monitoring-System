"use client";

import { Button } from "@/components/ui/button";

import {
  useDeactivateAsset,
  useUpdateAssetStatus,
} from "../api/use-asset-actions";
import type { Asset } from "../types/asset";
import { EditAssetDialog } from "./edit-asset-dialog";
import { AdminOnly } from "@/app/features/auth/components/admin-only";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EllipsisVertical, LoaderCircle, TriangleAlert } from "lucide-react";

interface AssetActionsProps {
  asset: Asset;
}

export function AssetActions({ asset }: AssetActionsProps) {
  const statusMutation = useUpdateAssetStatus();
  const deactivateMutation = useDeactivateAsset();

  const isPending = statusMutation.isPending || deactivateMutation.isPending;
  const isDeactivated = asset.status === "DEACTIVATE";

  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

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
    try {
      await deactivateMutation.mutateAsync(asset.assetId);
      setDeactivateDialogOpen(false);
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

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={isPending}
                    aria-label={`Actions for ${asset.name}`}
                  />
                }
              >
                <EllipsisVertical />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-40 duration-150"
              >
                {asset.status === "INACTIVATE" && (
                  <DropdownMenuItem
                    disabled={isPending}
                    onClick={() => void changeStatus("ACTIVATE")}
                  >
                    Activate
                  </DropdownMenuItem>
                )}

                {asset.status === "ACTIVATE" && (
                  <DropdownMenuItem
                    disabled={isPending}
                    onClick={() => void changeStatus("INACTIVATE")}
                  >
                    Inactivate
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    deactivateMutation.reset();
                    setDeactivateDialogOpen(true);
                  }}
                >
                  Deactivate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog
              open={deactivateDialogOpen}
              onOpenChange={setDeactivateDialogOpen}
            >
              <AlertDialogContent className="duration-150">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-rose-50 text-rose-600">
                    <TriangleAlert />
                  </AlertDialogMedia>

                  <AlertDialogTitle>Deactivate asset?</AlertDialogTitle>

                  <AlertDialogDescription>
                    {asset.name} will no longer be active. You can still view
                    its existing information, but the asset will become
                    read-only.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {deactivateMutation.isError && (
                  <p
                    role="alert"
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {deactivateMutation.error instanceof Error
                      ? deactivateMutation.error.message
                      : "Failed to deactivate asset"}
                  </p>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deactivateMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    variant="destructive"
                    disabled={deactivateMutation.isPending}
                    aria-busy={deactivateMutation.isPending}
                    onClick={() => void handleDeactivate()}
                    className="min-w-[7.5rem]"
                  >
                    {deactivateMutation.isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}

                    {deactivateMutation.isPending
                      ? "Deactivating..."
                      : "Deactivate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {statusMutation.isError && (
          <p className="max-w-80 text-right text-xs text-destructive">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : "Failed to update asset status"}
          </p>
        )}
      </div>
    </AdminOnly>
  );
}
