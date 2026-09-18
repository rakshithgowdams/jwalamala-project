"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoadingState } from "./LoadingState";

/** Mount optional interactive content shortly before it enters the viewport. */
export function Deferred({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root} className="deferred-component">
      {visible ? children : <LoadingState kind="panel" />}
    </div>
  );
}
