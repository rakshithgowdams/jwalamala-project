import type { NextConfig } from "next";
const imageKitHost = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "");
    return url.protocol === "https:" && url.hostname !== "ik.imagekit.io"
      ? url.hostname
      : "";
  } catch {
    return "";
  }
})();
const imageHosts =
  "https://ik.imagekit.io" + (imageKitHost ? " https://" + imageKitHost : "");
const config: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    cpus: 1,
  },
  turbopack: {},
  webpack: (config) => {
    config.cache = false;
    config.parallelism = 1;
    config.snapshot = {
      ...(config.snapshot ?? {}),
      managedPaths: [],
      immutablePaths: [],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "ik.imagekit.io" },
      ...(imageKitHost
        ? [{ protocol: "https" as const, hostname: imageKitHost }]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.ytimg.com https://*.supabase.co " +
              imageHosts +
              "; font-src 'self'; media-src 'self' https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
