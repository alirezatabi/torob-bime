import type { NextConfig } from "next";
const previewEmbedding = process.env.ALLOW_PREVIEW_EMBED === "true";
const nextConfig: NextConfig = {
  // Explicit opt-in only for a trusted development proxy; never hard-code preview hosts.
  allowedDevOrigins: process.env.DEV_PREVIEW_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          ...(!previewEmbedding ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
        ],
      },
    ];
  },
};
export default nextConfig;
