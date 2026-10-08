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

export type ProgramLevel = string;

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
  is_featured: boolean;
  school_name_en?: string | null;
  school_name_fr?: string | null;
  school_key?: string | null;
  admission_requirements_en?: string | null;
  admission_requirements_fr?: string | null;
  career_prospects_en?: string | null;
  career_prospects_fr?: string | null;
  curriculum_outline_en?: string | null;
  curriculum_outline_fr?: string | null;
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

/** A publication-controlled homepage hero banner. */
export interface HomeBanner {
  id: string;
  title_en: string;
  title_fr: string | null;
  subtitle_en: string;
  subtitle_fr: string | null;
  image_url: string;
  image_alt_en: string;
  image_alt_fr: string | null;
  cta_label_en: string;
  cta_label_fr: string | null;
  cta_href: string;
  sort_order: number;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

/** A staff-published collection of campus photos and videos. */
export interface GalleryAlbum {
  id: string;
  slug: string;
  title_en: string;
  title_fr: string | null;
  description_en: string | null;
  description_fr: string | null;
  cover_image_url: string | null;
  sort_order: number;
  published_at: string | null;
}

export interface GalleryItem {
  id: string;
  album_id: string;
  kind: "photo" | "youtube" | "vimeo" | "video" | "tour";
  source_url: string;
  thumbnail_url: string | null;
  caption_en: string;
  caption_fr: string | null;
  alt_en: string | null;
  alt_fr: string | null;
  sort_order: number;
  published_at: string | null;
}

export interface GalleryAlbumDetail {
  album: GalleryAlbum;
  items: GalleryItem[];
}

export interface LeadershipProfile {
  id: string;
  name: string;
  title_en: string;
  title_fr: string | null;
  department_en: string | null;
  department_fr: string | null;
  biography_en: string | null;
  biography_fr: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  reports_to_id: string | null;
  sort_order: number;
  published_at: string | null;
}

/** Payload for `POST /public/contact`. */
export interface ContactSubmission {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  subject: string;
  message: string;
  captcha_token?: string;
}

/** Query params accepted by the paginated public list endpoints. */
export interface ListQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  [key: string]: string | number | undefined;
}
