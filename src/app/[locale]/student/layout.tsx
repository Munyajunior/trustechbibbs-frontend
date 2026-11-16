import type { ReactNode } from "react";

import { ClientMessages } from "@/lib/client-messages";

export default function Layout({ children }: { children: ReactNode }) {
  return <ClientMessages namespaces={["student", "finance"]}>{children}</ClientMessages>;
}
