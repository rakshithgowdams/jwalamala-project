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
    if (
      [
        "facebook.com",
        "www.facebook.com",
        "m.facebook.com",
        "fb.watch",
      ].includes(url.hostname)
    ) {
      url.search = "";
      url.hash = "";
      return {
        provider: "facebook" as const,
        id: url.pathname,
        url: url.toString(),
      };
    }
  } catch {}
  return null;
}
