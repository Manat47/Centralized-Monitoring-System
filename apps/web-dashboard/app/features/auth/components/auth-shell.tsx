import type { ReactNode } from "react";
import { Activity } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-[#090b0f] text-slate-100">{children}</main>
  );
}

export function AuthBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
        <Activity className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Monitoring</p>
        <p className="text-[11px] text-slate-400">Control Plane</p>
      </div>
    </div>
  );
}
