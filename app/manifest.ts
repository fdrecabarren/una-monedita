import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UnaMonedita",
    short_name: "UnaMonedita",
    description: "Tu app personal de finanzas conectada a Notion",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3ee",
    theme_color: "#2fa86a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
