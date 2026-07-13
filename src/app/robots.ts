import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/search",
          "/items/",
          "/hikayeler",
          "/kayip-buro",
          "/map",
          "/pets",
          "/gizlilik",
          "/kullanim-sartlari",
          "/hesap-silme",
          "/users/",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/profile",
          "/messages",
          "/notifications",
          "/favorites",
          "/alerts",
          "/business",
          "/auth/",
          "/my-items",
          "/destek",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com"}/sitemap.xml`,
  };
}
