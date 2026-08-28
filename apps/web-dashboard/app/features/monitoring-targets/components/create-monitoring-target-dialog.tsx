"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CircleX, LoaderCircle, Plus } from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import type { Asset } from "@/app/features/assets/types/asset";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useCreateMonitoringTarget,
  useEnableMonitoringTarget,
  useVerifyMonitoringTarget,
} from "../api/use-monitoring-target-actions";
import { useMonitoringTargets } from "../api/use-monitoring-targets";
import type {
  CreateMonitoringTargetInput,
  MonitoringTarget,
} from "../types/monitoring-target";

type WizardStep = 1 | 2 | 3;

const initialForm: CreateMonitoringTargetInput = {
  assetId: "",
  protocol: "HTTP",
  port: 9100,
  path: "/metrics",
  scrapeIntervalSeconds: 15,
};

const steps: { value: WizardStep; label: string }[] = [
  { value: 1, label: "Select Asset" },
  { value: 2, label: "Configuration" },
  { value: 3, label: "Verify & Enable" },
];

function getServerAddress(asset: Asset | undefined): string {
  return asset?.hostname?.trim() || asset?.ipAddress?.trim() || "";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function CreateMonitoringTargetDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<CreateMonitoringTargetInput>(initialForm);
  const [createdTarget, setCreatedTarget] = useState<MonitoringTarget | null>(
    null,
  );
  const [verificationRequestError, setVerificationRequestError] = useState<
    string | null
  >(null);

  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();
  const createMutation = useCreateMonitoringTarget();
  const verifyMutation = useVerifyMonitoringTarget();
  const enableMutation = useEnableMonitoringTarget();

  const prerequisiteQueryFailed = assetsQuery.isError || targetsQuery.isError;
  const configuredAssetIds = new Set(
    (targetsQuery.data ?? []).map((target) => target.assetId),
  );
  const availableAssets = prerequisiteQueryFailed
    ? []
    : (assetsQuery.data ?? []).filter(
        (asset) =>
          asset.targetType === "SERVER" &&
          asset.status === "ACTIVATE" &&
          !configuredAssetIds.has(asset.assetId),
      );
  const selectedAsset = (assetsQuery.data ?? []).find(
    (asset) => asset.assetId === form.assetId,
  );
  const selectedAssetLabel = selectedAsset
    ? `${selectedAsset.name} — ${getServerAddress(selectedAsset)}`
    : undefined;
  const isVerifying = createMutation.isPending || verifyMutation.isPending;
  const verificationSucceeded =
    createdTarget?.verificationStatus === "VERIFIED";
  const verificationError =
    verificationRequestError ??
    (createdTarget?.verificationStatus === "FAILED"
      ? createdTarget.lastError || "Verification failed"
      : null);

  function resetDialog() {
    setStep(1);
    setForm(initialForm);
    setCreatedTarget(null);
    setVerificationRequestError(null);
    createMutation.reset();
    verifyMutation.reset();
    enableMutation.reset();
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (!value) {
      resetDialog();
    }
  }

  async function verifyTarget(target: MonitoringTarget) {
    setVerificationRequestError(null);

    try {
      const verifiedTarget = await verifyMutation.mutateAsync(target.targetId);
      setCreatedTarget(verifiedTarget);
    } catch (error) {
      setVerificationRequestError(
        getErrorMessage(error, "Failed to verify monitoring target"),
      );
    } finally {
      setStep(3);
    }
  }

  async function handleCreateAndVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let target = createdTarget;

    if (!target) {
      try {
        target = await createMutation.mutateAsync({
          assetId: form.assetId,
          protocol: form.protocol ?? "HTTP",
          port: Number(form.port),
          path: form.path?.trim() || "/metrics",
          scrapeIntervalSeconds: Number(form.scrapeIntervalSeconds),
        });
        setCreatedTarget(target);
      } catch {
        return;
      }
    }

    await verifyTarget(target);
  }

  async function handleEnable() {
    if (!createdTarget || !verificationSucceeded) {
      return;
    }

    try {
      await enableMutation.mutateAsync(createdTarget.targetId);
      handleOpenChange(false);
    } catch {
      // Mutation error is rendered in the verification step.
    }
  }

  return (
    <AdminOnly>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              className="
        gap-2 bg-blue-600 text-white
        shadow-sm shadow-blue-950/5
        transition-[background-color,box-shadow,transform] duration-150
        hover:bg-blue-700 hover:shadow
        active:scale-[0.99] active:bg-blue-800
      "
            />
          }
        >
          <Plus className="size-4" />
          Create Target
        </DialogTrigger>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Monitoring Target</DialogTitle>
            <DialogDescription className="sr-only">
              Configure a Node Exporter monitoring target for a server asset.
            </DialogDescription>
          </DialogHeader>

          <WizardProgress currentStep={step} />

          {step === 1 && (
            <div className="space-y-6 pt-5">
              <div className="grid gap-2">
                <Label>Select Asset</Label>
                <Select
                  value={form.assetId}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      assetId: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select a server asset">
                      {selectedAssetLabel}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {availableAssets.map((asset) => (
                      <SelectItem key={asset.assetId} value={asset.assetId}>
                        {asset.name} — {getServerAddress(asset)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {prerequisiteQueryFailed ? (
                  <p className="text-xs text-rose-600">
                    Unable to determine available servers. Reload after the
                    asset and monitoring services are reachable.
                  </p>
                ) : availableAssets.length === 0 &&
                  !assetsQuery.isLoading &&
                  !targetsQuery.isLoading ? (
                  <p className="text-xs text-slate-500">
                    No active server assets without a monitoring target.
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  disabled={
                    prerequisiteQueryFailed ||
                    !selectedAsset ||
                    !getServerAddress(selectedAsset)
                  }
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateAndVerify} className="space-y-6 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Protocol</Label>
                  <Select
                    value={form.protocol ?? "HTTP"}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        protocol: value === "HTTPS" ? "HTTPS" : "HTTP",
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {form.protocol === "HTTPS" ? "HTTPS" : "HTTP"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                      <SelectItem value="HTTPS">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="monitoring-host">Host</Label>
                  <Input
                    id="monitoring-host"
                    value={getServerAddress(selectedAsset)}
                    readOnly
                    className="bg-slate-50 font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="monitoring-port">Port</Label>
                  <Input
                    id="monitoring-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port ?? 9100}
                    required
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        port: Number(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="monitoring-path">Metrics Path</Label>
                  <Input
                    id="monitoring-path"
                    value={form.path ?? "/metrics"}
                    required
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        path: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="scrape-interval">
                    Scrape Interval (seconds)
                  </Label>
                  <Input
                    id="scrape-interval"
                    type="number"
                    min={5}
                    value={form.scrapeIntervalSeconds ?? 15}
                    required
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scrapeIntervalSeconds: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              {createMutation.isError && (
                <p className="text-sm text-rose-600">
                  {getErrorMessage(
                    createMutation.error,
                    "Failed to create monitoring target",
                  )}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isVerifying}
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isVerifying}>
                  {isVerifying && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {isVerifying ? "Verifying..." : "Verify connection"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {step === 3 && createdTarget && (
            <div className="space-y-6 pt-5">
              {verificationSucceeded ? (
                <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      Verification successful
                    </p>
                    <p className="mt-1 text-xs">
                      Node Exporter is reachable at{" "}
                      {form.protocol?.toLowerCase()}
                      ://{getServerAddress(selectedAsset)}:{form.port}
                      {form.path}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
                  <CircleX className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Verification failed</p>
                    <p className="mt-1 break-words text-xs">
                      {verificationError ?? "Unable to verify this target."}
                    </p>
                  </div>
                </div>
              )}

              {enableMutation.isError && (
                <p className="text-sm text-rose-600">
                  {getErrorMessage(
                    enableMutation.error,
                    "Failed to enable monitoring target",
                  )}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    verifyMutation.isPending || enableMutation.isPending
                  }
                  onClick={() => handleOpenChange(false)}
                >
                  Close
                </Button>

                {verificationSucceeded ? (
                  <Button
                    type="button"
                    disabled={enableMutation.isPending}
                    onClick={handleEnable}
                  >
                    {enableMutation.isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {enableMutation.isPending
                      ? "Enabling..."
                      : "Enable monitoring"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyTarget(createdTarget)}
                  >
                    {verifyMutation.isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {verifyMutation.isPending
                      ? "Verifying..."
                      : "Retry verification"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminOnly>
  );
}

function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      {steps.map((item, index) => {
        const active = item.value <= currentStep;

        return (
          <div
            key={item.value}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              className={
                active
                  ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
                  : "flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500"
              }
            >
              {item.value}
            </span>
            <span
              className={`truncate text-xs font-medium ${active ? "text-slate-900" : "text-slate-500"}`}
            >
              {item.label}
            </span>
            {index < steps.length - 1 && (
              <span className="ml-1 h-px min-w-3 flex-1 bg-slate-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}
