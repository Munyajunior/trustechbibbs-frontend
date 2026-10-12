import { apiList } from "./client";
import type { Locale, Paginated } from "./types";

export interface AuditEvent {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
}

export function getAuditEvents(
  token: string,
  locale: Locale,
  filters: { page: number; action?: string; resource_type?: string },
): Promise<Paginated<AuditEvent>> {
  return apiList<AuditEvent>("/audit/events", {
    token,
    locale,
    query: { ...filters, per_page: 20 },
    cache: "no-store",
  });
}
