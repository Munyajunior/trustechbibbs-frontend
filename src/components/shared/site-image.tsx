import type { CSSProperties } from "react";
import { preload } from "react-dom";

const FILL: CSSProperties = { position: "absolute", height: "100%", width: "100%", inset: 0, color: "transparent" };

/**
 * Plain `<img>` for `/site-media/*` artwork (same-origin proxy, already sized).
 * `next/image` adds nothing for these `unoptimized` fills except a client
 * component and its runtime on every page, so this renders no client JS.
 * Fills its (positioned) parent, exactly like `<Image fill unoptimized>`.
 */
export function SiteImage({
  src,
  alt = "",
  className,
  priority = false,
  sizes = "100vw",
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Mark the above-the-fold (LCP) image: eager load with high fetch priority. */
  priority?: boolean;
  /** Rendered width hint for the browser's candidate choice (defaults to full width). */
  sizes?: string;
}) {
  // Bundled artwork has a 768px variant; the proxy ignores `w` for uploaded media.
  const responsive = /^\/site-media\/[a-z-]+$/.test(src);
  const srcSet = responsive ? `${src}?w=768 768w, ${src} 1536w` : undefined;
  // Hoists a high-priority <link rel="preload"> into <head> so the LCP image is requested with the document.
  if (priority) preload(src, { as: "image", fetchPriority: "high", imageSrcSet: srcSet, imageSizes: responsive ? sizes : undefined });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional, see the component comment
    <img
      src={src}
      srcSet={srcSet}
      sizes={responsive ? sizes : undefined}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={FILL}
    />
  );
}
