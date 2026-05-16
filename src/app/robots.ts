import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com"}/sitemap.xml`,
  };
}
