import type { ReactNode } from "react";

import { StaffWorkspaceShell } from "@/components/features/staff-workspace-shell";
import { ClientMessages } from "@/lib/client-messages";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces="all"><StaffWorkspaceShell>{children}</StaffWorkspaceShell></ClientMessages>;
}
