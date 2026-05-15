import { MetadataRoute } from "next";

const BASE = "https://bulanvarmi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: BASE,                          priority: 1.0,  changeFrequency: "daily"   },
    { url: `${BASE}/search`,              priority: 0.9,  changeFrequency: "hourly"  },
    { url: `${BASE}/map`,                 priority: 0.8,  changeFrequency: "hourly"  },
    { url: `${BASE}/priority`,            priority: 0.7,  changeFrequency: "daily"   },
    { url: `${BASE}/pets`,                priority: 0.7,  changeFrequency: "daily"   },
    { url: `${BASE}/hikayeler`,           priority: 0.6,  changeFrequency: "weekly"  },
    { url: `${BASE}/kayip-buro`,          priority: 0.5,  changeFrequency: "monthly" },
    { url: `${BASE}/gizlilik`,            priority: 0.3,  changeFrequency: "monthly" },
    { url: `${BASE}/kullanim-sartlari`,   priority: 0.3,  changeFrequency: "monthly" },
    { url: `${BASE}/iade-politikasi`,     priority: 0.3,  changeFrequency: "monthly" },
  ] as MetadataRoute.Sitemap;

  return staticRoutes.map((r) => ({ ...r, lastModified: new Date() }));
}
