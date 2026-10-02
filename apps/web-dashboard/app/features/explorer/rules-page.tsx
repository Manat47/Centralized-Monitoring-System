"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { projectApi, type Project } from "@/app/features/projects/api";
import { ActivityRulesPanel } from "@/app/features/projects/activity-rules-panel";

export function ExplorerRulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    projectApi.list().then((items) => {
      if (!active) return;
      setProjects(items);
      if (!projectId && items.length) {
        const saved = window.localStorage.getItem("selected-log-project");
        router.replace(`/explorer/rules?projectId=${encodeURIComponent(items.find((item) => item.projectId === saved)?.projectId ?? items[0].projectId)}`);
      }
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load projects"); });
    return () => { active = false; };
  }, [projectId, router]);
  const project = projects.find((item) => item.projectId === projectId);
  return <section className="space-y-4"><header className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Log & Events</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Rules & Findings</h1></div><Link href={`/explorer${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Open Explorer</Link></header>
    <div className="rounded-xl border border-slate-200 bg-white p-4"><label htmlFor="rules-project" className="mb-1 block text-xs font-medium text-slate-600">Project</label><select id="rules-project" value={projectId} onChange={(event) => { window.localStorage.setItem("selected-log-project", event.target.value); router.replace(`/explorer/rules?projectId=${encodeURIComponent(event.target.value)}`); }} className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm sm:w-80"><option value="">Choose project</option>{projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.name}</option>)}</select></div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {project && <ActivityRulesPanel key={project.projectId} projectId={project.projectId} isOwner={project.role === "OWNER"} />}
  </section>;
}
