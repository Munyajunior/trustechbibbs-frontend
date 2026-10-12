import type { ReactNode } from "react";

import { StaffWorkspaceShell } from "@/components/features/staff-workspace-shell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffWorkspaceShell>{children}</StaffWorkspaceShell>;
}
