import { Suspense } from "react";
import { ExplorerRulesPage } from "@/app/features/explorer/rules-page";

export default function Page() {
  return <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading rules...</p>}><ExplorerRulesPage /></Suspense>;
}
