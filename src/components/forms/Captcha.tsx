"use client";
import Script from "next/script";
import { useId, useRef, useEffect, useCallback } from "react";
export function Captcha({
  onToken,
  reset = 0,
}: {
  onToken: (token: string) => void;
  reset?: number;
}) {
  const id = "captcha-" + useId().replace(/[^a-z0-9]/gi, ""),
    widget = useRef<string | null>(null),
    callback = useRef(onToken),
    key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  const render = useCallback(() => {
    if (key && window.turnstile && widget.current === null) {
      widget.current = window.turnstile.render("#" + id, {
        sitekey: key,
        callback: (token) => callback.current(token),
        "expired-callback": () => callback.current(""),
      });
    }
  }, [id, key]);
  useEffect(() => {
    render();
    return () => {
      if (widget.current !== null) {
        window.turnstile?.remove?.(widget.current);
        widget.current = null;
      }
    };
  }, [render]);
  useEffect(() => {
    if (reset && widget.current !== null)
      window.turnstile?.reset?.(widget.current);
  }, [reset]);
  return (
    <>
      <div id={id} />
      {key && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={render}
        />
      )}
    </>
  );
}
