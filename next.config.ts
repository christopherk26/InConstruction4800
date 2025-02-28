
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  eslint: {
    // This will completely bypass ESLint during the build process
    ignoreDuringBuilds: true,
  },
  // Keep images unoptimized for simpler builds
  images: {
    unoptimized: true,
  },
};

export default nextConfig;