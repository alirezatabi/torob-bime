import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.e2b.app"],
  poweredByHeader: false,
};

export default nextConfig;
