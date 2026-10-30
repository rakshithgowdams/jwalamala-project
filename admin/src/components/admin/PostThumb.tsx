"use client";
import { useState } from "react";

/** YouTube answers a missing HD thumbnail with a tiny grey picture. Fall back to the standard size. */
export function PostThumb({ src, eager = false }: { src: string; eager?: boolean }) {
  const [url, setUrl] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin grid preview of a stored image link
    <img
      src={url}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        if (url.includes("i.ytimg.com/") && url.endsWith("/maxresdefault.jpg"))
          setUrl(url.replace(/\/maxresdefault\.jpg$/, "/hqdefault.jpg"));
      }}
    />
  );
}
