import { Suspense } from "react";

import { InfrastructureConsole } from "@/app/features/monitoring-targets/components/infrastructure-console";

export default function InfrastructurePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-500">
          Loading infrastructure...
        </div>
      }
    >
      <InfrastructureConsole />
    </Suspense>
  );
}
