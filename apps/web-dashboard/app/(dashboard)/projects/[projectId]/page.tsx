import { ProjectDetailPage } from "@/app/features/projects/project-detail-page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectDetailPage projectId={projectId} />;
}
