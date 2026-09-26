import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krishi Bazar AI — কৃষি বাজার",
    short_name: "Krishi Bazar",
    description: "Weather, crop prices and forecasts for Bangladesh farmers and traders",
    start_url: "/today",
    display: "standalone",
    background_color: "#f6f5ef",
    theme_color: "#1b6e4a",
    lang: "bn",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
