/**
 * Fetch helpers that never throw.
 *
 * The public marketing pages are statically generated. If the backend happens
 * to be down at build time (or during local dev before anyone starts the API),
 * a thrown error would fail the whole build. These wrappers degrade to a
 * fallback value and log instead, so the page still renders its shell.
 *
 * Use these ONLY for non-essential, decorative sections. A route whose entire
 * purpose is the data (e.g. a program detail page) should let the error bubble
 * so Next can render notFound()/error.tsx correctly.
 */

import { ApiError, ApiUnreachableError } from "./client";

/** Await a promise, returning `fallback` if it rejects. */
export async function safeFetch<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
): Promise<{ data: T; failed: boolean }> {
  try {
    return { data: await promise, failed: false };
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      console.warn(`[${label}] API unreachable — rendering fallback content.`);
    } else if (error instanceof ApiError) {
      console.warn(`[${label}] API error ${error.status} (${error.code}).`);
    } else {
      console.warn(`[${label}] Unexpected error:`, error);
    }
    return { data: fallback, failed: true };
  }
}
