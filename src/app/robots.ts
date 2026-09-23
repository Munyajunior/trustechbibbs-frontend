import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  // Keep staging/preview out of the index; only allow crawling in production.
  const isProduction = process.env.NEXT_PUBLIC_ENV === "production";

  return {
    rules: isProduction
      ? [
          {
            userAgent: "*",
            allow: "/",
            // Authenticated areas must never be indexed.
            disallow: ["/api/", "/*/dashboard", "/*/portal"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
