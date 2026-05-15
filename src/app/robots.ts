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
    sitemap: "https://bulanvarmi.com/sitemap.xml",
  };
}
