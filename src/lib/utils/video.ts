export function normalizeVideo(input: string) {
  try {
    const url = new URL(input);
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
    )
      id =
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ||
        null;
    if (id && /^[\w-]{11}$/.test(id))
      return {
        provider: "youtube" as const,
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    if (url.hostname === "fb.watch" && url.pathname.length > 1)
      return {
        provider: "facebook" as const,
        id: url.pathname,
        url: `https://fb.watch${url.pathname}`,
      };
    if (/^(?:www\.|m\.|web\.|mbasic\.)?facebook\.com$/.test(url.hostname)) {
      // watch/?v=… and video.php?v=… carry the video only in the query string.
      const v = url.searchParams.get("v");
      if (v && /^\d+$/.test(v))
        return {
          provider: "facebook" as const,
          id: v,
          url: `https://www.facebook.com/watch/?v=${v}`,
        };
      const path = url.pathname.replace(/\/+$/, "");
      if (path && !/^\/(?:watch|video\.php)$/.test(path))
        return {
          provider: "facebook" as const,
          id: path,
          url: `https://www.facebook.com${path}/`,
        };
    }
  } catch {}
  return null;
}
