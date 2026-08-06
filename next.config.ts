import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // docs/NOTION-SCHEMA.md is read at runtime by /api/notion/guide (Ajustes →
  // Mantenimiento → "Publicar guía") — without this it doesn't get traced
  // into the serverless function bundle and the route 500s in production.
  outputFileTracingIncludes: {
    "/api/notion/guide": ["./docs/NOTION-SCHEMA.md"],
  },
  experimental: {
    // Optimistic Server Actions feedback
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
