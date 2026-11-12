import type { MetadataRoute } from "next";
import { activeSchemas } from "@/lib/schemas/registry";
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site?.startsWith("https://")) return [];
  const base = site.replace(/\/$/, "");
  return [
    "",
    "/roadmap",
    "/evaluation",
    ...activeSchemas.map((schema) => `/compare/${schema.slug}`),
  ].map((path) => ({ url: `${base}${path}` }));
}
