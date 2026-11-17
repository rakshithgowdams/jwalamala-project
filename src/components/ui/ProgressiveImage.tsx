"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { imageKitEndpoint } from "@/lib/utils/images";

const optimizedHost =
  /^(?:i\.ytimg\.com|ik\.imagekit\.io|[\w-]+\.supabase\.co|127\.0\.0\.1)$/;

/** Next's image optimizer only fetches hosts listed in next.config. Other cloud links load in the browser. */
function canOptimize(src: ImageProps["src"]) {
  if (typeof src !== "string" || src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    if (optimizedHost.test(host)) return true;
    return !!imageKitEndpoint && host === new URL(imageKitEndpoint).hostname;
  } catch {
    return false;
  }
}

export function ProgressiveImage(props: ImageProps) {
  return (
    <ImageWithState
      key={
        typeof props.src === "string" ? props.src : JSON.stringify(props.src)
      }
      {...props}
    />
  );
}
function ImageWithState(props: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = failed ? "/images/jwalamala-logo.jpg" : props.src;
  if (!canOptimize(props.src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cloud image hosts are not sent through the optimizer
      <img
        src={typeof src === "string" ? src : ""}
        alt={props.alt}
        className={[
          props.className,
          "progressive-image",
          loaded ? "is-loaded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          props.fill
            ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
            : undefined
        }
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
      />
    );
  }
  return (
    <>
      {!loaded && props.fill && (
        <span aria-hidden="true" className="image-skeleton skeleton-block" />
      )}
      <Image
        {...props}
        alt={props.alt}
        src={src}
        className={[
          props.className,
          "progressive-image",
          loaded ? "is-loaded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onLoad={(event) => {
          setLoaded(true);
          props.onLoad?.(event);
        }}
        onError={(event) => {
          setFailed(true);
          setLoaded(true);
          props.onError?.(event);
        }}
      />
    </>
  );
}
