import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-slate-100", className)}
      {...props}
    />
  );
}

export { Skeleton };
