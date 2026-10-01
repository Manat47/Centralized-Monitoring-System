"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { projectApi, type Project } from "./api";
import { useAuth } from "@/app/features/auth/components/auth-provider";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invalidRpm, setInvalidRpm] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    projectApi.list().then(setProjects).catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : "Could not load projects"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    const update = () => { projectApi.invalidRpm()
      .then((result) => setInvalidRpm(result.invalidRequestsPerMinute))
      .catch(() => undefined); };
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, [user?.role]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const project = await projectApi.create(name);
      setProjects((current) => [project, ...current]);
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage log ingestion, access tokens and event history for each project.</p>
    </div>
    {user?.role === "ADMIN" && <p className="text-xs text-muted-foreground">Invalid token requests across the system, last 60 seconds: {invalidRpm ?? "—"}</p>}
    <Card>
      <CardHeader><CardTitle className="text-base">Create project</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
          <Input aria-label="Project name" placeholder="Project name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required />
          <Button disabled={saving} type="submit"><Plus className="mr-2 size-4" />{saving ? "Creating…" : "Create"}</Button>
        </form>
      </CardContent>
    </Card>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading projects…</p> : projects.length === 0 ?
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No projects yet. Create one to start receiving logs.</CardContent></Card> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => <Link key={project.projectId} href={`/projects/${project.projectId}`} className="block">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-3"><FolderKanban className="size-5 text-primary" /><strong className="truncate">{project.name}</strong></div>
              <p className="break-all font-mono text-xs text-muted-foreground">{project.projectId}</p>
              <p className="text-xs text-muted-foreground">{project.role}</p>
            </CardContent>
          </Card>
        </Link>)}
      </div>}
  </section>;
}
