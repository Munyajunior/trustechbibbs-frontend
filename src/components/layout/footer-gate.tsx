"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/** The staff workspace has its own chrome, so the public footer is hidden there. */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/staff") ? null : <>{children}</>;
}
