import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** Crawlers that collect articles for AI training or republishing, not search. */
const contentScrapers = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
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
      ...(site.demo ? [] : [{ userAgent: contentScrapers, disallow: "/" }]),
    ],
    sitemap: site.demo
      ? undefined
      : [
          site.url + "/sitemap.xml",
          site.url + "/news-sitemap.xml",
          site.url + "/image-sitemap.xml",
        ],
  };
}
