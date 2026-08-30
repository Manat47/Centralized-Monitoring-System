"use client";

import { useState } from "react";
import {
  Bell,
  EllipsisVertical,
  Gauge,
  HeartPulse,
  History,
  LoaderCircle,
  RotateCcw,
  Server,
  TriangleAlert,
} from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAssetLifecycleImpact } from "../api/use-asset-lifecycle-impact";
import {
  useDeactivateAsset,
  useUpdateAssetStatus,
} from "../api/use-asset-actions";
import type { Asset } from "../types/asset";
import type {
  AssetLifecycleAction,
  AssetLifecycleImpact,
  LifecycleResourceImpact,
} from "../types/asset-lifecycle-impact";
import { EditAssetDialog } from "./edit-asset-dialog";

interface AssetActionsProps {
  asset: Asset;
}

export function AssetActions({ asset }: AssetActionsProps) {
  const statusMutation = useUpdateAssetStatus();
  const deactivateMutation = useDeactivateAsset();
  const [pendingAction, setPendingAction] =
    useState<AssetLifecycleAction | null>(null);
  const impactQuery = useAssetLifecycleImpact(asset.assetId, pendingAction);

  const isPending = statusMutation.isPending || deactivateMutation.isPending;
  const isDeactivated = asset.status === "DEACTIVATE";

  function openConfirmation(action: AssetLifecycleAction): void {
    statusMutation.reset();
    deactivateMutation.reset();
    setPendingAction(action);
  }

  async function confirmAction(): Promise<void> {
    if (!pendingAction) {
      return;
    }

    try {
      if (pendingAction === "DEACTIVATE") {
        await deactivateMutation.mutateAsync(asset.assetId);
      } else {
        await statusMutation.mutateAsync({
          assetId: asset.assetId,
          status: pendingAction,
        });
      }

      setPendingAction(null);
    } catch {
      // Mutation errors remain visible in the confirmation dialog.
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
                    onClick={() => openConfirmation("ACTIVATE")}
                  >
                    Activate
                  </DropdownMenuItem>
                )}

                {asset.status === "ACTIVATE" && (
                  <DropdownMenuItem
                    disabled={isPending}
                    onClick={() => openConfirmation("INACTIVATE")}
                  >
                    Inactivate
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => openConfirmation("DEACTIVATE")}
                >
                  Deactivate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog
              open={pendingAction !== null}
              onOpenChange={(open) => {
                if (!open && !isPending) {
                  setPendingAction(null);
                }
              }}
            >
              <AlertDialogContent className="duration-150 sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogMedia
                    className={
                      pendingAction === "DEACTIVATE"
                        ? "bg-rose-50 text-rose-600"
                        : pendingAction === "INACTIVATE"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-blue-50 text-blue-600"
                    }
                  >
                    {pendingAction === "ACTIVATE" ? (
                      <RotateCcw />
                    ) : (
                      <TriangleAlert />
                    )}
                  </AlertDialogMedia>

                  <AlertDialogTitle>
                    {pendingAction
                      ? `${formatAction(pendingAction)} asset?`
                      : "Update asset?"}
                  </AlertDialogTitle>

                  <AlertDialogDescription>
                    Review the operational impact on {asset.name} before
                    continuing.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {impactQuery.isLoading && <ImpactLoading />}

                {impactQuery.isError && (
                  <div
                    role="alert"
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    <p>
                      Unable to load the lifecycle impact. No changes have been
                      made.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full bg-white"
                      onClick={() => void impactQuery.refetch()}
                    >
                      <RotateCcw />
                      Retry
                    </Button>
                  </div>
                )}

                {impactQuery.data && (
                  <div>
                    <div className="divide-y divide-slate-100 border-y border-slate-200">
                      <ImpactRow
                        icon={Server}
                        label="Monitoring targets"
                        impact={impactQuery.data.resources.monitoringTargets}
                      />
                      <ImpactRow
                        icon={HeartPulse}
                        label="Health checks"
                        impact={impactQuery.data.resources.healthChecks}
                      />
                      <ImpactRow
                        icon={Gauge}
                        label="Metric rules"
                        impact={impactQuery.data.resources.metricRules}
                      />
                      <div className="flex items-center gap-3 py-3">
                        <Bell className="size-4 shrink-0 text-slate-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            Active alerts
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatAlertImpact(impactQuery.data)}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                          {impactQuery.data.alerts.total}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                      <History className="mt-0.5 size-3.5 shrink-0" />
                      Existing metrics, health results, alert lifecycle, and
                      audit history will be preserved.
                    </p>
                  </div>
                )}

                {(statusMutation.isError || deactivateMutation.isError) && (
                  <p
                    role="alert"
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {getMutationError(
                      statusMutation.error,
                      deactivateMutation.error,
                    )}
                  </p>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    variant={
                      pendingAction === "DEACTIVATE"
                        ? "destructive"
                        : "default"
                    }
                    disabled={
                      isPending ||
                      impactQuery.isLoading ||
                      impactQuery.isError ||
                      !impactQuery.data
                    }
                    aria-busy={isPending}
                    onClick={() => void confirmAction()}
                    className="min-w-[7.5rem]"
                  >
                    {isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}

                    {isPending
                      ? "Updating..."
                      : pendingAction
                        ? formatAction(pendingAction)
                        : "Confirm"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </AdminOnly>
  );
}

function formatAction(action: AssetLifecycleAction): string {
  switch (action) {
    case "ACTIVATE":
      return "Activate";
    case "INACTIVATE":
      return "Inactivate";
    case "DEACTIVATE":
      return "Deactivate";
  }
}

function formatResourceEffect(impact: LifecycleResourceImpact): string {
  if (impact.effect === "NONE") {
    return impact.configured > 0
      ? `${impact.configured} configured, none enabled`
      : "Not configured";
  }

  const verb = {
    RESUME: "resume",
    PAUSE: "pause",
    STOP: "stop permanently",
  }[impact.effect];

  return `${impact.enabled} enabled will ${verb}`;
}

function formatAlertImpact(impact: AssetLifecycleImpact): string {
  if (impact.alerts.total === 0) {
    return "No active alerts";
  }

  const detail = `${impact.alerts.triggered} triggered, ${impact.alerts.acknowledged} acknowledged`;

  if (impact.alerts.effect === "RESOLVE") {
    return `${detail}; active alerts will resolve`;
  }

  if (impact.alerts.effect === "RETAIN") {
    return `${detail}; active alerts remain active`;
  }

  return `${detail}; statuses remain unchanged`;
}

function getMutationError(
  statusError: Error | null,
  deactivateError: Error | null,
): string {
  const error = statusError ?? deactivateError;
  return error instanceof Error ? error.message : "Failed to update asset";
}

function ImpactLoading() {
  return (
    <div
      className="space-y-3 border-y border-slate-200 py-3"
      aria-label="Loading lifecycle impact"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="size-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ImpactRow({
  icon: Icon,
  label,
  impact,
}: {
  icon: typeof Server;
  label: string;
  impact: LifecycleResourceImpact;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="size-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatResourceEffect(impact)}
        </p>
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
        {impact.enabled}
      </span>
    </div>
  );
}
