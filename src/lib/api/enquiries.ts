import { API_BASE_URL, ApiError, ApiUnreachableError, apiList, apiRequest } from "./client";
import type { ApiErrorBody, Locale, Paginated } from "./types";

export type EnquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface ContactEnquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  subject: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
  attachment_filename: string | null;
  attachment_content_type: string | null;
  attachment_size_bytes: number | null;
}

export function listEnquiries(
  token: string, locale: Locale, page: number, status?: EnquiryStatus,
): Promise<Paginated<ContactEnquiry>> {
  return apiList<ContactEnquiry>("/cms/contact-submissions", {
    token, locale, cache: "no-store", query: { page, per_page: 20, ...(status ? { status } : {}) },
  });
}

export function updateEnquiryStatus(
  id: string, status: EnquiryStatus, token: string, locale: Locale,
): Promise<ContactEnquiry> {
  return apiRequest<ContactEnquiry>(`/cms/contact-submissions/${encodeURIComponent(id)}/status`, {
    token, locale, cache: "no-store", method: "PATCH", body: { status },
  });
}

export async function getEnquiryAttachment(id: string, token: string, locale: Locale): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/cms/contact-submissions/${encodeURIComponent(id)}/attachment`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": locale }, cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: ApiErrorBody } | null;
    const fallback: ApiErrorBody = {
      code: "ATTACHMENT_UNAVAILABLE", message_en: "Attachment unavailable.",
      message_fr: "Pièce jointe indisponible.", details: [], reference_id: "n/a",
    };
    throw new ApiError(response.status, result?.error ?? fallback);
  }
  return response.blob();
}
