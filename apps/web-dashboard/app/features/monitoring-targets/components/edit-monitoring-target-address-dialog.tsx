"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import type { Asset } from "@/app/features/assets/types/asset";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useUpdateMonitoringTarget,
  useVerifyMonitoringTarget,
} from "../api/use-monitoring-target-actions";
import {
  getAddressForSource,
  getAvailableAddressSources,
  getEffectiveAddressSource,
  getNodeExporterUrl,
} from "../lib/monitoring-address";
import type {
  MonitoringAddressSource,
  MonitoringTarget,
} from "../types/monitoring-target";

interface EditMonitoringTargetAddressDialogProps {
  target: MonitoringTarget | null;
  asset: Asset | undefined;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to update monitoring address";
}

export function EditMonitoringTargetAddressDialog({
  target,
  asset,
  onOpenChange,
}: EditMonitoringTargetAddressDialogProps) {
  const updateMutation = useUpdateMonitoringTarget();
  const verifyMutation = useVerifyMonitoringTarget();
  const [selection, setSelection] = useState<{
    targetId: string;
    source: MonitoringAddressSource;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source =
    target && selection?.targetId === target.targetId
      ? selection.source
      : target
        ? getEffectiveAddressSource(target, asset)
        : null;

  const availableSources = getAvailableAddressSources(asset);
  const scrapeUrl =
    target && source ? getNodeExporterUrl(target, asset, source) : "";
  const isPending = updateMutation.isPending || verifyMutation.isPending;

  async function handleSaveAndVerify() {
    if (!target || !source) return;

    setError(null);

    try {
      const updated = await updateMutation.mutateAsync({
        targetId: target.targetId,
        input: { addressSource: source },
      });
      await verifyMutation.mutateAsync(updated.targetId);
      onOpenChange(false);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          setSelection(null);
          setError(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connection address</DialogTitle>
          <DialogDescription>
            Select the server address reachable from the monitoring service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {availableSources.map((option) => (
              <Button
                key={option}
                type="button"
                variant="outline"
                className={`h-auto min-h-16 cursor-pointer justify-between px-3 py-2 text-left transition-colors ${
                  source === option
                    ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-100 hover:bg-blue-100"
                    : "bg-white hover:border-blue-300 hover:bg-blue-50/50"
                }`}
                disabled={isPending}
                onClick={() => {
                  if (!target) return;

                  setSelection({
                    targetId: target.targetId,
                    source: option,
                  });

                  setError(null);
                }}
              >
                <span>
                  <span className="block text-sm font-medium">
                    {option === "HOSTNAME" ? "Hostname" : "IP address"}
                  </span>

                  <span className="block font-mono text-xs opacity-80">
                    {getAddressForSource(asset, option)}
                  </span>
                </span>

                {source === option && (
                  <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                )}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Scrape URL</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-900">
              {scrapeUrl || "No usable address configured"}
            </p>
          </div>

          {target?.monitoringEnabled && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Saving pauses monitoring and metric rule evaluation until the new
              address is verified.
            </p>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            disabled={!source || !scrapeUrl || isPending}
            onClick={handleSaveAndVerify}
          >
            {isPending && <LoaderCircle className="size-4 animate-spin" />}
            {isPending ? "Saving..." : "Save and re-verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
