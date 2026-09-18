import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: site.demo ? undefined : "/",
      disallow: site.demo
        ? "/"
        : [
            "/admin",
            "/account",
            "/login",
            "/api",
            "/search",
            "/review",
            "/auth",
          ],
    },
    sitemap: site.demo
      ? undefined
      : [
          site.url + "/sitemap.xml",
          site.url + "/news-sitemap.xml",
          site.url + "/image-sitemap.xml",
        ],
  };
}
