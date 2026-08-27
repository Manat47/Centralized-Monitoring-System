"use client";

import { Fragment, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  AlertTriangle,
  Archive,
  LoaderCircle,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  useArchiveHealthCheckTarget,
  useCheckHealthCheckTargetNow,
  usePauseHealthCheckTarget,
  useResumeHealthCheckTarget,
  useUpdateHealthCheckTarget,
} from "../api/use-health-check-actions";
import { useHealthCheckTargets } from "../api/use-health-check-targets";
import type { HealthCheckTarget } from "../types/health-check";
import {
  getHealthResultStatus,
  getHealthRuntimeState,
  hasOriginMismatch,
  type HealthResultStatus,
} from "./health-check-status";

function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const resultStyles: Record<HealthResultStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  UNAVAILABLE: "border-rose-200 bg-rose-50 text-rose-700",
  STALE: "border-amber-200 bg-amber-50 text-amber-700",
  UNKNOWN: "border-slate-200 bg-slate-100 text-slate-600",
};

const resultLabels: Record<HealthResultStatus, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  STALE: "Stale",
  UNKNOWN: "Unknown",
};

function runtimeLabel(state: ReturnType<typeof getHealthRuntimeState>) {
  return {
    RUNNING: "Running",
    PAUSED: "Paused",
    PAUSED_BY_ASSET: "Paused by asset",
    RETIRED: "Retired",
    ARCHIVED: "Archived",
  }[state];
}

export function HealthChecksTable() {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<"ALL" | HealthResultStatus>("ALL");
  const [archiveFilter, setArchiveFilter] = useState<"CURRENT" | "ARCHIVED" | "ALL">("CURRENT");
  const [editingTarget, setEditingTarget] = useState<HealthCheckTarget | null>(null);
  const targetsQuery = useHealthCheckTargets();
  const assetsQuery = useAssets();
  const pauseMutation = usePauseHealthCheckTarget();
  const resumeMutation = useResumeHealthCheckTarget();
  const archiveMutation = useArchiveHealthCheckTarget();
  const checkNowMutation = useCheckHealthCheckTargetNow();
  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.assetId, asset])), [assets]);
  const targets = useMemo(() => targetsQuery.data ?? [], [targetsQuery.data]);
  const filteredTargets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return targets.filter((target) => {
      const asset = assetById.get(target.assetId);
      const result = getHealthResultStatus(target);
      const matchesArchive =
        archiveFilter === "ALL" ||
        (archiveFilter === "ARCHIVED" ? Boolean(target.archivedAt) : !target.archivedAt);
      return (
        matchesArchive &&
        (resultFilter === "ALL" || result === resultFilter) &&
        (!query || asset?.name.toLowerCase().includes(query) || target.url.toLowerCase().includes(query))
      );
    });
  }, [archiveFilter, assetById, resultFilter, search, targets]);
  const actionError =
    pauseMutation.error ?? resumeMutation.error ?? archiveMutation.error ?? checkNowMutation.error;

  if (targetsQuery.isLoading || assetsQuery.isLoading) {
    return <HealthChecksSkeleton />;
  }

  if (targetsQuery.isError || assetsQuery.isError) {
    return <Card><CardContent className="py-12 text-center text-sm text-rose-600">Failed to load health checks.</CardContent></Card>;
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search application or URL" className="w-full sm:w-64" />
            <Select value={resultFilter} onValueChange={(value) => setResultFilter((value ?? "ALL") as typeof resultFilter)}>
              <SelectTrigger className="w-full bg-white sm:w-44"><SelectValue>{resultFilter === "ALL" ? "All statuses" : resultLabels[resultFilter]}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={archiveFilter} onValueChange={(value) => setArchiveFilter((value ?? "CURRENT") as typeof archiveFilter)}>
              <SelectTrigger className="w-full bg-white sm:w-40"><SelectValue>{archiveFilter === "CURRENT" ? "Current" : archiveFilter === "ARCHIVED" ? "Archived" : "All records"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="CURRENT">Current</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
                <SelectItem value="ALL">All records</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="ghost" disabled={!search && resultFilter === "ALL" && archiveFilter === "CURRENT"} onClick={() => { setSearch(""); setResultFilter("ALL"); setArchiveFilter("CURRENT"); }}>
              <RotateCcw className="size-4" /> Clear
            </Button>
            <span className={cn("ml-auto text-xs text-slate-500", (targetsQuery.isFetching || assetsQuery.isFetching) && "animate-pulse")}>{filteredTargets.length} of {targets.length} checks{(targetsQuery.isFetching || assetsQuery.isFetching) && " · Updating"}</span>
          </div>

          {actionError && <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError instanceof Error ? actionError.message : "Failed to update health check"}</div>}

          <Table className="min-w-[980px]">
            <TableHeader><TableRow>
              <TableHead className="pl-4">Application</TableHead><TableHead>URL</TableHead><TableHead>State</TableHead><TableHead>Latest status</TableHead><TableHead>HTTP</TableHead><TableHead>Response</TableHead><TableHead>Last checked</TableHead><TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody className={cn("transition-opacity duration-150", (targetsQuery.isFetching || assetsQuery.isFetching) && "opacity-70")}>
              {filteredTargets.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-28 text-center text-slate-500">No health checks match the current view.</TableCell></TableRow>
              ) : filteredTargets.map((target) => {
                const asset = assetById.get(target.assetId);
                const result = getHealthResultStatus(target);
                const runtime = getHealthRuntimeState(target, asset);
                const mismatch = hasOriginMismatch(asset?.endpoint ?? null, target.url);
                const pendingId = pauseMutation.variables ?? resumeMutation.variables ?? archiveMutation.variables ?? checkNowMutation.variables;
                const pending = pendingId === target.healthCheckTargetId;
                const actionable = !target.archivedAt && asset?.status !== "DEACTIVATE";

                return (
                  <Fragment key={target.healthCheckTargetId}>
                    <TableRow className={cn("transition-colors duration-150", target.latest?.error && "border-b-0")}>
                      <TableCell className="pl-4 font-medium text-slate-900">{asset?.name ?? "Unknown application"}</TableCell>
                      <TableCell>
                        <div className="flex max-w-md items-center gap-2">
                          <Link href={`/health-checks/${target.healthCheckTargetId}`} className="truncate rounded-sm font-mono text-xs text-blue-700 transition-colors duration-150 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">{target.url}</Link>
                          {mismatch && <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-label="Origin differs from application endpoint" />}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{runtimeLabel(runtime)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={resultStyles[result]}>{resultLabels[result]}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{target.latest?.statusCode ?? "—"}</TableCell>
                      <TableCell>{target.latest ? `${target.latest.responseTimeMs} ms` : "—"}</TableCell>
                      <TableCell>{formatRelativeDate(target.latest?.timestamp ?? target.lastCheckedAt)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <AdminOnly>
                          <MenuPrimitive.Root>
                            <MenuPrimitive.Trigger aria-label={`Actions for ${asset?.name ?? "health check"}`} disabled={pending} className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
                            </MenuPrimitive.Trigger>
                            <MenuPrimitive.Portal><MenuPrimitive.Positioner side="bottom" align="end" sideOffset={4} className="z-50"><MenuPrimitive.Popup className="min-w-44 rounded-md bg-white p-1 text-sm shadow-md ring-1 ring-slate-200 outline-none">
                              <MenuItem icon={RefreshCw} label="Check now" disabled={!actionable || asset?.status !== "ACTIVATE"} onClick={() => checkNowMutation.mutate(target.healthCheckTargetId)} />
                              {target.enabled ? <MenuItem icon={Pause} label="Pause" disabled={!actionable} onClick={() => pauseMutation.mutate(target.healthCheckTargetId)} /> : <MenuItem icon={Play} label="Resume" disabled={!actionable} onClick={() => resumeMutation.mutate(target.healthCheckTargetId)} />}
                              <MenuItem icon={Pencil} label="Edit interval" disabled={!actionable} onClick={() => setEditingTarget(target)} />
                              <MenuItem icon={Archive} label="Archive" destructive disabled={!actionable} onClick={() => { if (window.confirm("Archive this health check? Its history will remain available.")) archiveMutation.mutate(target.healthCheckTargetId); }} />
                            </MenuPrimitive.Popup></MenuPrimitive.Positioner></MenuPrimitive.Portal>
                          </MenuPrimitive.Root>
                        </AdminOnly>
                      </TableCell>
                    </TableRow>
                    {target.latest?.error && <TableRow className="bg-rose-50/70 hover:bg-rose-50/70"><TableCell colSpan={8} className="px-4 py-2 text-xs text-rose-700">{target.latest.error}</TableCell></TableRow>}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditIntervalDialog
        key={editingTarget?.healthCheckTargetId ?? "closed"}
        target={editingTarget}
        onClose={() => setEditingTarget(null)}
      />
    </>
  );
}

function MenuItem({ icon: Icon, label, disabled, destructive, onClick }: { icon: typeof Play; label: string; disabled?: boolean; destructive?: boolean; onClick: () => void }) {
  return <MenuPrimitive.Item disabled={disabled} onClick={onClick} className={`flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100 data-disabled:opacity-40 ${destructive ? "text-rose-600" : ""}`}><Icon className="size-4" />{label}</MenuPrimitive.Item>;
}

function HealthChecksSkeleton() {
  return <Card className="overflow-hidden border-slate-200 shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap"><Skeleton className="h-8 w-full sm:w-64" /><Skeleton className="h-8 w-full sm:w-44" /><Skeleton className="h-8 w-full sm:w-40" /></div><Skeleton className="h-10 w-full rounded-none" />{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid h-16 grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.7fr] items-center gap-5 border-t border-slate-100 px-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-44" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /><Skeleton className="h-3 w-16" /></div>)}</CardContent></Card>;
}

function EditIntervalDialog({ target, onClose }: { target: HealthCheckTarget | null; onClose: () => void }) {
  const [interval, setInterval] = useState(target?.checkIntervalSeconds ?? 15);
  const mutation = useUpdateHealthCheckTarget();

  function handleOpenChange(open: boolean) {
    if (!open) { mutation.reset(); onClose(); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    try { await mutation.mutateAsync({ id: target.healthCheckTargetId, checkIntervalSeconds: interval }); onClose(); } catch {}
  }

  return <Dialog open={Boolean(target)} onOpenChange={handleOpenChange}><DialogContent><DialogHeader><DialogTitle>Edit check interval</DialogTitle><DialogDescription>The endpoint URL remains unchanged to preserve history integrity.</DialogDescription></DialogHeader><form onSubmit={handleSubmit} className="space-y-5"><div className="grid gap-2"><Label htmlFor="edit-health-interval">Interval (seconds)</Label><Input id="edit-health-interval" type="number" min={5} value={interval} onChange={(event) => setInterval(Number(event.target.value))} /></div>{mutation.isError && <p className="text-sm text-rose-600">{mutation.error instanceof Error ? mutation.error.message : "Failed to update interval"}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
