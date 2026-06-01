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
          "/priority",
          "/gizlilik",
          "/kullanim-sartlari",
          "/iade-politikasi",
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
          "/upgrade",
          "/destek",
          "/payment/",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com"}/sitemap.xml`,
  };
}
