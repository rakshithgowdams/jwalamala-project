"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

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
  return (
    <>
      {!loaded && props.fill && (
        <span aria-hidden="true" className="image-skeleton skeleton-block" />
      )}
      <Image
        {...props}
        alt={props.alt}
        src={failed ? "/images/jwalamala-logo.jpg" : props.src}
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
