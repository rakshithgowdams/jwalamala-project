import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { kn } from "@/content/strings.kn";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.fullName,
    short_name: site.name,
    description: site.description,
    lang: "kn",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    theme_color: "#1F2447",
    background_color: "#FFFFFF",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: kn.live, url: "/videos?tab=live" },
      { name: kn.search, url: "/search" },
      { name: kn.events, url: "/events" },
    ],
  };
}
