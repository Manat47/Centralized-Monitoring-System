import { ProjectDetailPage } from "@/app/features/projects/project-detail-page";
import { connection } from "next/server";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  await connection();
  const { projectId } = await params;
  const configuredUrl = process.env.LOG_INGEST_PUBLIC_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3010" : "");
  let ingestEndpoint: string | null = null;

  if (configuredUrl) {
    try {
      const origin = new URL(configuredUrl);
      if (
        (origin.protocol === "http:" || origin.protocol === "https:") &&
        !origin.username && !origin.password &&
        origin.pathname === "/" && !origin.search && !origin.hash
      ) {
        ingestEndpoint = new URL("/api/ingest/logs", origin).toString();
      }
    } catch {
      // The page shows a configuration message instead of an unusable command.
    }
  }

  return <ProjectDetailPage projectId={projectId} ingestEndpoint={ingestEndpoint} />;
}
