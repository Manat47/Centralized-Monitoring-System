import type { ReactNode } from "react";

import { AdminRoute } from "@/app/features/auth/components/admin-route";

interface UsersLayoutProps {
  children: ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
  return <AdminRoute>{children}</AdminRoute>;
}
