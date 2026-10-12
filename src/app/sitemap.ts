import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://egrantet.vercel.app";
}

/**
 * Sitemap of canonical public pages only. Published grant-detail URLs are
 * included because their content is genuinely public; drafts, applications,
 * documents, dashboards, and private identifiers are never listed. When the
 * database is unreachable (e.g. build without credentials), the static
 * public pages are still returned — the sitemap never fails the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/grants`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const { listPublicDirectoryGrants } = await import("@/modules/grants");
    const grants = await listPublicDirectoryGrants();
    const grantUrls: MetadataRoute.Sitemap = grants.map((grant) => ({
      url: `${base}/grants/${grant.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return [...staticPages, ...grantUrls];
  } catch {
    return staticPages;
  }
}
