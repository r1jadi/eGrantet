import type { MetadataRoute } from "next";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://egrantet.vercel.app";
}

/**
 * Only canonical public pages are crawlable. Authenticated, administrative,
 * evaluator, and API routes are disallowed here AND protected by server-side
 * authentication/authorization — robots.txt is not a security boundary.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/grants", "/privacy", "/terms"],
        disallow: [
          "/admin",
          "/municipality",
          "/evaluator",
          "/applications",
          "/projects",
          "/notifications",
          "/settings",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
