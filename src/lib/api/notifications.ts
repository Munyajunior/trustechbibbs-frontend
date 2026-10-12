import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export interface InAppNotification {
  id: string;
  kind: string;
  title_en: string;
  title_fr: string;
  body_en: string;
  body_fr: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export type NotificationType = "application_status" | "enrollment" | "course_registration" | "results" | "transcript";

export interface NotificationPreference {
  notification_type: NotificationType;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
}

export function listNotifications(
  token: string,
  locale: Locale,
  page = 1,
  unreadOnly = false,
  perPage = 20,
): Promise<Paginated<InAppNotification>> {
  return apiList<InAppNotification>("/notifications", {
    token,
    locale,
    query: { page, per_page: perPage, unread_only: unreadOnly ? "true" : "false" },
    cache: "no-store",
  });
}

export function getUnreadNotificationCount(token: string, locale: Locale): Promise<{ count: number }> {
  return apiRequest<{ count: number }>("/notifications/unread-count", {
    token,
    locale,
    cache: "no-store",
  });
}

export function markNotificationRead(
  id: string,
  token: string,
  locale: Locale,
): Promise<InAppNotification> {
  return apiRequest<InAppNotification>(`/notifications/${id}/read`, {
    method: "PATCH",
    token,
    locale,
  });
}

export function markNotificationUnread(
  id: string,
  token: string,
  locale: Locale,
): Promise<InAppNotification> {
  return apiRequest<InAppNotification>(`/notifications/${id}/unread`, {
    method: "PATCH",
    token,
    locale,
  });
}

export function getNotificationPreferences(
  token: string,
  locale: Locale,
): Promise<{ preferences: NotificationPreference[] }> {
  return apiRequest<{ preferences: NotificationPreference[] }>("/notifications/preferences", {
    token,
    locale,
    cache: "no-store",
  });
}

export function updateNotificationPreferences(
  preferences: NotificationPreference[],
  token: string,
  locale: Locale,
): Promise<{ preferences: NotificationPreference[] }> {
  return apiRequest<{ preferences: NotificationPreference[] }>("/notifications/preferences", {
    method: "PUT",
    body: { preferences },
    token,
    locale,
  });
}

export function markAllNotificationsRead(token: string, locale: Locale): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>("/notifications/read-all", {
    method: "POST",
    token,
    locale,
  });
}
