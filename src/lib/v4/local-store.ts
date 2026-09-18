"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
export function useLocalValue<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener("jwalamala-local", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("jwalamala-local", callback);
    };
  }, []);
  const get = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, get, () => null);
  const value = useMemo(() => {
    try {
      return raw ? schema.parse(JSON.parse(raw)) : fallback;
    } catch {
      return fallback;
    }
  }, [raw, schema, fallback]);
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event("jwalamala-local"));
      } catch {
        /* Browser storage can be disabled. */
      }
    },
    [key],
  );
  return [value, set] as const;
}
export const followSchema = z
  .array(
    z.object({
      target_type: z.enum([
        "category",
        "tag",
        "topic",
        "place",
        "author",
        "series",
      ]),
      target_id: z.string(),
      label_kn: z.string(),
    }),
  )
  .max(500);
export type LocalFollow = z.infer<typeof followSchema>[number];
export const historySchema = z
  .array(
    z.object({
      id: z.string(),
      href: z.string().regex(/^\/(?![\/\\])/),
      title: z.string(),
      viewed_at: z.string(),
    }),
  )
  .max(200);
export const FOLLOW_KEY = "jwalamala-follows";
export const HISTORY_KEY = "jwalamala-history";
