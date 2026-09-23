/**
 * Types mirroring the backend API contract (see backend docs/API_CONVENTIONS.md).
 *
 * The backend is bilingual at the data layer: translatable fields ship as a
 * `*_en` / `*_fr` pair where `_en` is always present and `_fr` may be null.
 * Use `pickLocalized()` from `@/lib/i18n-field` to resolve them.
 */

/** Locales supported by the platform. */
export type Locale = "en" | "fr";

/** Envelope metadata attached to every response. */
export interface ResponseMeta {
  timestamp: string;
  request_id: string;
}

/** Pagination block returned alongside list responses. */
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_cursor?: string | null;
}

/** Successful response envelope. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
  pagination?: Pagination;
}

/** A single field-level validation problem. */
export interface ApiErrorDetail {
  field: string;
  message_en: string;
  message_fr: string;
  code: string;
}

/** Error payload inside a failure envelope. */
export interface ApiErrorBody {
  code: string;
  message_en: string;
  message_fr: string;
  details: ApiErrorDetail[];
  reference_id: string;
}

/** Failure response envelope. */
export interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  meta: ResponseMeta;
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

/** A list result with its pagination block preserved. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

/* -------------------------------------------------------------------------- */
/* Domain resources                                                            */
/* -------------------------------------------------------------------------- */

export type ProgramLevel = "CERTIFICATE" | "DIPLOMA" | "HND" | "BACHELOR" | "MASTER";

/** An academic program (`GET /public/programs`). */
export interface Program {
  id: string;
  slug: string;
  code: string;
  name_en: string;
  name_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
  level: ProgramLevel;
  duration_years: number;
  tuition_fee: string; // DECIMAL serialized as string to avoid float drift
  currency: string; // "XAF"
  school_name_en?: string | null;
  school_name_fr?: string | null;
  campus_id?: string | null;
  brochure_url?: string | null;
}

/** A news article (`GET /public/news`). */
export interface NewsArticle {
  id: string;
  slug: string;
  title_en: string;
  title_fr: string | null;
  excerpt_en: string | null;
  excerpt_fr: string | null;
  content_en?: string | null;
  content_fr?: string | null;
  category: string | null;
  tags: string[];
  cover_image_url: string | null;
  published_at: string;
}

/** An event (`GET /public/events`). */
export interface CampusEvent {
  id: string;
  slug: string;
  title_en: string;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  category: string | null;
  cover_image_url: string | null;
  registration_required: boolean;
  capacity: number | null;
}

/** Payload for `POST /public/contact`. */
export interface ContactSubmission {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  subject: string;
  message: string;
}

/** Query params accepted by the paginated public list endpoints. */
export interface ListQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  [key: string]: string | number | undefined;
}
