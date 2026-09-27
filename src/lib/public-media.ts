/**
 * Only render CMS images from paths served by this site or the configured
 * development object store. A production CDN must be added to next.config.ts
 * before its URLs are accepted here.
 */
export function publicMediaSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" && url.hostname === "localhost" && url.port === "9000") {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}
