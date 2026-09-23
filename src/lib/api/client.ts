/**
 * Typed fetch wrapper for the THIBBS backend.
 *
 * Responsibilities:
 *  - resolve the base URL from the environment (never hardcode a host)
 *  - attach `Accept-Language` and (optionally) a Bearer token
 *  - unwrap the success envelope down to `data`
 *  - convert failure envelopes into a typed, throwable `ApiError`
 *
 * Works in both Server Components and the browser. In a Server Component the
 * caller must pass the locale explicitly; there is no ambient request context.
 */

import type {
  ApiErrorBody,
  Envelope,
  ListQuery,
  Locale,
  Paginated,
  Pagination,
  SuccessEnvelope,
} from "./types";

/** Base URL of the backend API, e.g. http://localhost:8000/api/v1 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/**
 * A backend error, carrying the bilingual payload so callers can surface the
 * message in the active locale.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message_en);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** The error message in the requested locale, falling back to English. */
  localizedMessage(locale: Locale = "en"): string {
    if (locale === "fr" && this.body.message_fr) return this.body.message_fr;
    return this.body.message_en;
  }

  /** Machine-readable code, e.g. `VALIDATION_ERROR`, `TOKEN_EXPIRED`. */
  get code(): string {
    return this.body.code;
  }
}

/** Thrown when the API is unreachable (backend down, DNS, CORS, timeout). */
export class ApiUnreachableError extends Error {
  constructor(cause: unknown) {
    super("The API could not be reached.");
    this.name = "ApiUnreachableError";
    this.cause = cause;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Locale sent via `Accept-Language`. Defaults to `en`. */
  locale?: Locale;
  /** JWT access token for authenticated calls. */
  token?: string;
  /** JSON request body — serialized automatically. */
  body?: unknown;
  /** Query-string params; `undefined` values are dropped. */
  query?: ListQuery;
  /** Next.js caching / revalidation options (Server Components only). */
  next?: { revalidate?: number | false; tags?: string[] };
}

function buildUrl(path: string, query?: ListQuery): string {
  const url = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Fallback error body for non-envelope failures (proxy 502s, HTML pages...). */
function syntheticError(status: number, statusText: string): ApiErrorBody {
  return {
    code: "UNEXPECTED_ERROR",
    message_en: `Request failed (${status} ${statusText}).`,
    message_fr: `La requête a échoué (${status} ${statusText}).`,
    details: [],
    reference_id: "n/a",
  };
}

/**
 * Perform a request and return the full envelope.
 * Prefer {@link apiRequest} unless you need the `pagination` block.
 */
export async function apiRequestEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<SuccessEnvelope<T>> {
  const { locale = "en", token, body, query, next, headers, ...init } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": locale,
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (token) requestHeaders["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(next ? { next } : {}),
    });
  } catch (cause) {
    // Network-level failure: the backend isn't running or is unreachable.
    throw new ApiUnreachableError(cause);
  }

  // 204 No Content — nothing to unwrap.
  if (response.status === 204) {
    return {
      success: true,
      data: undefined as T,
      meta: { timestamp: new Date().toISOString(), request_id: "n/a" },
    };
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      response.status,
      syntheticError(response.status, response.statusText),
    );
  }

  if (!response.ok || payload.success === false) {
    const errorBody =
      payload && payload.success === false
        ? payload.error
        : syntheticError(response.status, response.statusText);
    throw new ApiError(response.status, errorBody);
  }

  return payload;
}

/** Perform a request and return just the unwrapped `data`. */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const envelope = await apiRequestEnvelope<T>(path, options);
  return envelope.data;
}

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  per_page: 0,
  total: 0,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

/** Perform a list request, returning items plus the pagination block. */
export async function apiList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Paginated<T>> {
  const envelope = await apiRequestEnvelope<T[]>(path, options);
  return {
    items: envelope.data ?? [],
    pagination: envelope.pagination ?? {
      ...EMPTY_PAGINATION,
      per_page: envelope.data?.length ?? 0,
      total: envelope.data?.length ?? 0,
    },
  };
}
