import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Wires src/i18n/request.ts into the App Router.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fail the production build on type errors rather than shipping them.
  // (Next 16 removed the `eslint` config key — linting is a separate
  // `npm run lint` step, enforced in CI.)
  typescript: { ignoreBuildErrors: false },

  images: {
    // Media is served from MinIO in dev and S3/CDN in production.
    // Add the production bucket/CDN host here before go-live.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    // Matches the responsive srcset widths in the UI/UX spec.
    deviceSizes: [320, 640, 768, 1024, 1200, 1920],
    imageSizes: [150, 320],
  },

  // Security headers. The CSP lives at the edge/Nginx layer in production;
  // these are the app-level baseline.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Standalone output keeps the production Docker image small.
  output: "standalone",
};

export default withNextIntl(nextConfig);
