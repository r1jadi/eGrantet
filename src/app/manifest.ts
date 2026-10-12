import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eGrantet — Municipal grants & subsidies",
    short_name: "eGrantet",
    description:
      "Discover municipal grants, apply online, and track your application.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#123f69",
    lang: "sq",
    dir: "ltr",
    categories: ["government", "business", "finance"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
