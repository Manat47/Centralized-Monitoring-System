"use client";

import { useState } from "react";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <GenerateReportForm
          key={seed?.reportId ?? "new-report"}
          seed={seed}
          onOpenChange={onOpenChange}
        />
      )}
    </Dialog>
  );
}

function GenerateReportForm({
  seed,
  onOpenChange,
}: {
  seed: ReportListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const assetsQuery = useAssets();
  const generateMutation = useGenerateReport();

  const [assetId, setAssetId] = useState(seed?.assetId ?? "ALL");

  const [periodStart, setPeriodStart] = useState(() =>
    seed ? formatDateInput(seed.periodStart) : defaultStartDate(),
  );

  const [periodEnd, setPeriodEnd] = useState(() =>
    seed ? formatDateInput(seed.periodEnd) : formatDateInput(new Date()),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const [today] = useState(() => formatDateInput(new Date()));

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

            <SelectContent
              alignItemWithTrigger={false}
              sideOffset={6}
              className="duration-150"
            >
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
              className="
  h-10
  focus-visible:border-blue-500
  focus-visible:ring-2
  focus-visible:ring-blue-500/20
"
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
              className="
  h-10
  focus-visible:border-blue-500
  focus-visible:ring-2
  focus-visible:ring-blue-500/20
"
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
          className="
    bg-blue-600 text-white
    transition-[background-color,transform] duration-150
    hover:bg-blue-700
    active:scale-[0.99] active:bg-blue-800
  "
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
  );
}
