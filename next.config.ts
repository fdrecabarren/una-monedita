import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Optimistic Server Actions feedback
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
