import { Suspense } from "react";
import { ExplorerPage } from "@/app/features/explorer/explorer-page";

export default function Page() {
  return <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading Explorer...</p>}><ExplorerPage /></Suspense>;
}
