import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                          priority: 1.0,  changeFrequency: "daily",   lastModified: new Date() },
    { url: `${BASE}/search`,              priority: 0.9,  changeFrequency: "hourly",  lastModified: new Date() },
    { url: `${BASE}/map`,                 priority: 0.8,  changeFrequency: "hourly",  lastModified: new Date() },
    { url: `${BASE}/priority`,            priority: 0.7,  changeFrequency: "daily",   lastModified: new Date() },
    { url: `${BASE}/pets`,                priority: 0.7,  changeFrequency: "daily",   lastModified: new Date() },
    { url: `${BASE}/hikayeler`,           priority: 0.6,  changeFrequency: "weekly",  lastModified: new Date() },
    { url: `${BASE}/kayip-buro`,          priority: 0.5,  changeFrequency: "monthly", lastModified: new Date() },
    { url: `${BASE}/gizlilik`,            priority: 0.3,  changeFrequency: "monthly", lastModified: new Date() },
    { url: `${BASE}/kullanim-sartlari`,   priority: 0.3,  changeFrequency: "monthly", lastModified: new Date() },
    { url: `${BASE}/iade-politikasi`,     priority: 0.3,  changeFrequency: "monthly", lastModified: new Date() },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: items } = await supabase
      .from("items")
      .select("id, updated_at, created_at")
      .eq("status", "active")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(2000);

    const itemRoutes: MetadataRoute.Sitemap = (items ?? []).map((item) => ({
      url: `${BASE}/items/${item.id}`,
      lastModified: new Date(item.updated_at ?? item.created_at ?? new Date()),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

    return [...staticRoutes, ...itemRoutes];
  } catch {
    return staticRoutes;
  }
}
