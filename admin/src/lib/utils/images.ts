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

/** Bundled site images or ImageKit links; files are never stored in Supabase. */
export function isHostedImage(value: string) {
  return value.startsWith("/images/") || isRemoteImage(value);
}

const thumbnailSizes = /^(?:default|mqdefault|hqdefault|sddefault|maxresdefault|[0-3])$/;
/** The only YouTube thumbnail form stored; i.ytimg.com is allowed by the image config and CSP. */
export const youtubeThumbnailPattern =
  /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault|[0-3])\.jpg$/;

/**
 * Turns any YouTube thumbnail link (img.youtube.com, i.ytimg.com, i1.ytimg.com,
 * .jpg or .webp) or a YouTube video link into https://i.ytimg.com/vi/ID/SIZE.jpg.
 * A video link gives the HD thumbnail.
 */
export function youtubeThumbnail(input: string) {
  const text = input.trim();
  try {
    const url = new URL(text);
    if (/^(?:img\.youtube\.com|i\d?\.ytimg\.com)$/.test(url.hostname)) {
      const match = url.pathname.match(/^\/vi(?:_webp)?\/([\w-]{11})\/([a-z0-9]+)\.(?:jpg|webp)$/);
      return match && thumbnailSizes.test(match[2])
        ? `https://i.ytimg.com/vi/${match[1]}/${match[2]}.jpg`
        : null;
    }
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : /^(?:www\.|m\.)?youtube\.com$/.test(url.hostname)
          ? url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
  } catch {
    return null;
  }
}

const imageFile = /\.(?:jpe?g|png|webp|gif|avif)$/i;
const cloudHost =
  /^(?:[\w-]+\.)*(?:googleusercontent\.com|ggpht\.com|cloudinary\.com|imgur\.com|imgbb\.com|fbcdn\.net|cdninstagram\.com|twimg\.com|wp\.com|cloudfront\.net)$/i;

function isYouTubeHost(hostname: string) {
  return (
    hostname === "img.youtube.com" ||
    hostname === "youtu.be" ||
    /^(?:[\w-]+\.)?youtube\.com$/.test(hostname) ||
    /^i\d?\.ytimg\.com$/.test(hostname)
  );
}

/** Blocks link-local and private addresses so a cover cannot point at the server itself. */
function isPublicHttps(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost"))
    return false;
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return true;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/**
 * Canonical cover address: a YouTube thumbnail, an ImageKit link, a direct
 * https image file, or a known image CDN. Returns null when the text is not one of those.
 */
export function coverImageUrl(input: string) {
  const text = input.trim().replace(/^<|>$/g, "").replace(/ /g, "%20");
  const youtube = youtubeThumbnail(text);
  if (youtube) return youtube;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!isPublicHttps(url) || isYouTubeHost(url.hostname)) return null;
  if (isRemoteImage(url.href) || imageFile.test(url.pathname) || cloudHost.test(url.hostname))
    return url.href;
  return null;
}

/** Reads an image address out of a pasted picture (HTML) or a pasted link. */
export function imageUrlFromPaste(html: string, text: string) {
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const raw = (match?.[1] || match?.[2] || match?.[3] || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const absolute = raw.startsWith("//") ? "https:" + raw : raw;
  return coverImageUrl(absolute) || coverImageUrl(text);
}

/** Cover images: a site/ImageKit image, a stored YouTube thumbnail, or a cloud image link. */
export function isCoverImage(value: string) {
  if (isHostedImage(value) || youtubeThumbnailPattern.test(value)) return true;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!isPublicHttps(url) || isYouTubeHost(url.hostname)) return false;
  return imageFile.test(url.pathname) || cloudHost.test(url.hostname);
}

/** Accepts a bare image URL or a Markdown image like ![alt](url "title"). */
export function parseImageLink(input: string) {
  const text = input.trim();
  const markdown = text.match(/^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/);
  const link = markdown ? markdown[2].replace(/^<|>$/g, "") : text;
  const src = youtubeThumbnail(link) || link;
  return isCoverImage(src) ? { src, alt: markdown?.[1].trim() || "" } : null;
}
