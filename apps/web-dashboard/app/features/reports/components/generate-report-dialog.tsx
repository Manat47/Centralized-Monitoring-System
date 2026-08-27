"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePlus2, LoaderCircle } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import { useGenerateReport } from "../api/use-reports";
import type { ReportListItem } from "../types/report";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function formatDateInput(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function defaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return formatDateInput(date);
}

export function GenerateReportDialog({
  open,
  seed,
  onOpenChange,
}: {
  open: boolean;
  seed: ReportListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const assetsQuery = useAssets();
  const generateMutation = useGenerateReport();
  const [assetId, setAssetId] = useState("ALL");
  const [periodStart, setPeriodStart] = useState(defaultStartDate);
  const [periodEnd, setPeriodEnd] = useState(() => formatDateInput(new Date()));
  const [validationError, setValidationError] = useState<string | null>(null);
  const today = useMemo(() => formatDateInput(new Date()), []);

  useEffect(() => {
    if (!open) return;

    setAssetId(seed?.assetId ?? "ALL");
    setPeriodStart(
      seed ? formatDateInput(seed.periodStart) : defaultStartDate(),
    );
    setPeriodEnd(
      seed ? formatDateInput(seed.periodEnd) : formatDateInput(new Date()),
    );
    setValidationError(null);
    generateMutation.reset();
  }, [open, seed]);

  async function submit(): Promise<void> {
    setValidationError(null);

    if (!periodStart || !periodEnd) {
      setValidationError("Select both the start and end dates.");
      return;
    }

    if (periodStart > periodEnd) {
      setValidationError("Start date must be on or before the end date.");
      return;
    }

    try {
      await generateMutation.mutateAsync({
        assetId: assetId === "ALL" ? undefined : assetId,
        periodStart: new Date(`${periodStart}T00:00:00+07:00`).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59.999+07:00`).toISOString(),
      });
      onOpenChange(false);
    } catch {
      // The mutation error is rendered below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {seed ? "Generate report again" : "Generate report"}
          </DialogTitle>
          <DialogDescription>
            Build a PDF from the monitoring data recorded during this period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-scope">Scope</Label>
            <Select
              value={assetId}
              onValueChange={(value) => setAssetId(value ?? "ALL")}
              disabled={assetsQuery.isLoading || generateMutation.isPending}
            >
              <SelectTrigger id="report-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All assets</SelectItem>
                {assetsQuery.data?.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.name} (
                    {asset.targetType === "SERVICE"
                      ? "Application"
                      : asset.targetType}
                    )
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-period-start">Start date</Label>
              <Input
                id="report-period-start"
                type="date"
                value={periodStart}
                max={today}
                onChange={(event) => setPeriodStart(event.target.value)}
                disabled={generateMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-period-end">End date</Label>
              <Input
                id="report-period-end"
                type="date"
                value={periodEnd}
                max={today}
                onChange={(event) => setPeriodEnd(event.target.value)}
                disabled={generateMutation.isPending}
              />
            </div>
          </div>

          {(validationError || generateMutation.error) && (
            <p className="text-sm text-destructive" role="alert">
              {validationError ??
                (generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : "Report generation failed")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={generateMutation.isPending}
            aria-busy={generateMutation.isPending}
            className="min-w-[9.5rem]"
          >
            {generateMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <FilePlus2 className="size-4" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
