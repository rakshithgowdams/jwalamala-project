export type VideoProvider = "youtube" | "facebook" | "instagram";
export type VideoKind = "video" | "reel" | "post";
export type NormalizedVideo = {
  provider: VideoProvider;
  id: string;
  url: string;
  kind: VideoKind;
};

function instagramVideo(url: URL): NormalizedVideo | null {
  if (
    !/^(?:www\.|m\.)?instagram\.com$/.test(url.hostname) &&
    url.hostname !== "instagr.am"
  )
    return null;
  const match = url.pathname.match(/^\/(p|reel|reels|tv|share)\/([^/?#]+)/i);
  if (!match) return null;
  const id = match[2];
  const kind: VideoKind =
    match[1].toLowerCase() === "p" ? "post" : "reel";
  const path = match[1].toLowerCase() === "p" ? "p" : "reel";
  return {
    provider: "instagram",
    id,
    url: `https://www.instagram.com/${path}/${id}/`,
    kind,
  };
}

export function normalizeVideo(input: string): NormalizedVideo | null {
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
        provider: "youtube",
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        kind: url.pathname.includes("/shorts/") ? "reel" : "video",
      };
    const instagram = instagramVideo(url);
    if (instagram) return instagram;
    if (url.hostname === "fb.watch" && url.pathname.length > 1)
      return {
        provider: "facebook",
        id: url.pathname,
        url: `https://fb.watch${url.pathname}`,
        kind: "video",
      };
    if (/^(?:www\.|m\.|web\.|mbasic\.)?facebook\.com$/.test(url.hostname)) {
      // watch/?v=… and video.php?v=… carry the video only in the query string.
      const v = url.searchParams.get("v");
      if (v && /^\d+$/.test(v))
        return {
          provider: "facebook",
          id: v,
          url: `https://www.facebook.com/watch/?v=${v}`,
          kind: "video",
        };
      const path = url.pathname.replace(/\/+$/, "");
      if (path && !/^\/(?:watch|video\.php)$/.test(path))
        return {
          provider: "facebook",
          id: path,
          url: `https://www.facebook.com${path}/`,
          kind: /\/reel(?:s)?\//i.test(path) ? "reel" : "video",
        };
    }
  } catch {}
  return null;
}
