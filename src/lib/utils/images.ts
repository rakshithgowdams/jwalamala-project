const imageKit = /^https:\/\/ik\.imagekit\.io\/[A-Za-z0-9_-]+\/\S+$/;

/** Optional custom ImageKit domain, e.g. https://images.example.com */
export const imageKitEndpoint = (
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ""
).replace(/\/+$/, "");

export function isRemoteImage(value: string) {
  return (
    imageKit.test(value) ||
    (!!imageKitEndpoint &&
      /^https:\/\//.test(imageKitEndpoint) &&
      value.startsWith(imageKitEndpoint + "/") &&
      !/\s/.test(value))
  );
}

/** YouTube thumbnails as the admin stores them; i.ytimg.com is allowed by the image config and CSP. */
export const youtubeThumbnailPattern =
  /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault|[0-3])\.jpg$/;

/** Bundled site images or ImageKit links; files are never stored in Supabase. */
export function isHostedImage(value: string) {
  return value.startsWith("/images/") || isRemoteImage(value);
}

const imageFile = /\.(?:jpe?g|png|webp|gif|avif)$/i;

function isPublicImageHost(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return true;
  const a = Number(ip[1]);
  const b = Number(ip[2]);
  return !(a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31));
}

/** An image the article may show: site file, ImageKit, YouTube thumbnail, or any public https image file. */
export function isArticleImage(value: string) {
  if (isHostedImage(value) || youtubeThumbnailPattern.test(value)) return true;
  try {
    const url = new URL(value);
    return isPublicImageHost(url) && imageFile.test(url.pathname);
  } catch {
    return false;
  }
}
