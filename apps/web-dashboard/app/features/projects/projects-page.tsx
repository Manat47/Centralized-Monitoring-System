"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, FolderKanban, FolderOpen, Plus, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/app/features/auth/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { projectApi, type Project, type ProjectRole } from "./api";

const roleClass: Record<ProjectRole, string> = {
  OWNER: "border-blue-200 bg-blue-50 text-blue-700",
  MAINTAINER: "border-violet-200 bg-violet-50 text-violet-700",
  VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"ALL" | ProjectRole>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [invalidRpm, setInvalidRpm] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    projectApi.list()
      .then(setProjects)
      .catch((cause: unknown) => { setLoadFailed(true); setError(cause instanceof Error ? cause.message : "Could not load projects"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    const update = () => {
      projectApi.invalidRpm()
        .then((result) => setInvalidRpm(result.invalidRequestsPerMinute))
        .catch(() => undefined);
    };
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, [user?.role]);

  const filtered = useMemo(() => projects.filter((project) =>
    (role === "ALL" || project.role === role) &&
    project.name.toLowerCase().includes(query.trim().toLowerCase()),
  ), [projects, query, role]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const project = await projectApi.create(name);
      setProjects((current) => [project, ...current]);
      setName("");
      setQuery("");
      setRole("ALL");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Log workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">Manage event streams, access and activity for each project.</p>
      </div>
      <Badge variant="outline" className="w-fit border-slate-200 bg-white px-3 py-1 text-slate-600">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
      </Badge>
    </div>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

    {user?.role === "ADMIN" && <Card className="border-slate-200 bg-white shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><ShieldAlert className="size-4" /></div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">Invalid token requests</p>
          <p className="text-xs text-slate-500">Across all projects in the last 60 seconds</p>
        </div>
        <span className="ml-auto text-xl font-semibold tabular-nums text-slate-900">{invalidRpm ?? "—"}</span>
      </CardContent>
    </Card>}

    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader><CardTitle className="text-base text-slate-950">Create a project</CardTitle>
        <p className="text-sm text-slate-500">Each project has its own members, API tokens and logs.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={create} aria-busy={saving} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" placeholder="e.g. Customer portal" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required className="rounded-lg border-slate-200" />
          </div>
          <Button disabled={saving} type="submit" className="rounded-lg bg-blue-600 text-white transition-colors duration-150 hover:bg-blue-700 active:bg-blue-800">
            <Plus className="mr-2 size-4" />{saving ? "Creating..." : "Create project"}
          </Button>
        </form>
      </CardContent>
    </Card>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-base font-semibold text-slate-950">Your projects</h2><p className="text-xs text-slate-500">Select a project to explore logs and manage access.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <div className="relative sm:w-60"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-lg border-slate-200 bg-white pl-9" />
        </div>
        <select aria-label="Filter by project role" value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
          <option value="ALL">All roles</option><option value="OWNER">Owner</option><option value="MAINTAINER">Maintainer</option><option value="VIEWER">Viewer</option>
        </select>
      </div>
    </div>

    {loading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) =>
      <Card key={index} className="border-slate-200 shadow-none"><CardContent className="space-y-4 p-5"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></CardContent></Card>)}</div>
      : loadFailed ? <Card className="border-rose-200 bg-rose-50 shadow-none"><CardContent className="py-10 text-center text-sm text-rose-700">Could not load your projects. Refresh this page to try again.</CardContent></Card>
      : projects.length === 0 ? <Card className="border-slate-200 shadow-none"><CardContent className="flex flex-col items-center py-12 text-center"><FolderOpen className="size-10 text-slate-300" /><p className="mt-3 font-medium text-slate-900">No projects yet</p><p className="mt-1 text-sm text-slate-500">Create a project above to start receiving logs.</p></CardContent></Card>
      : filtered.length === 0 ? <Card className="border-slate-200 shadow-none"><CardContent className="py-10 text-center text-sm text-slate-500">No projects match your filters.</CardContent></Card>
      : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => <Link key={project.projectId} href={`/projects/${project.projectId}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
          <Card className="h-full border-slate-200 bg-white shadow-none transition-colors duration-150 group-hover:border-blue-300 group-hover:bg-blue-50/20">
            <CardContent className="p-5"><div className="flex items-start justify-between gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FolderKanban className="size-4" /></div>
              <ArrowUpRight className="size-4 text-slate-400 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </div>
              <h3 className="mt-4 truncate font-semibold text-slate-950">{project.name}</h3>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">{project.projectId}</p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Badge variant="outline" className={roleClass[project.role]}>{project.role}</Badge>
                <span className="text-xs text-slate-500">Created {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(project.createdAt))}</span>
              </div>
            </CardContent>
          </Card>
        </Link>)}
      </div>}
  </section>;
}
