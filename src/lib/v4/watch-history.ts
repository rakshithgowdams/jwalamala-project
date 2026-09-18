import { z } from "zod";
export const WATCH_KEY = "jwalamala-watch-history";
export const watchSchema = z
  .array(
    z.object({
      id: z.string().max(100),
      href: z.string().regex(/^\/video\/[a-z0-9-]+$/),
      title: z.string().max(300),
      seconds: z.number().finite().min(0).max(172800),
      updated_at: z.string(),
    }),
  )
  .max(50);
export type WatchItem = z.infer<typeof watchSchema>[number];
export function saveWatch(item: WatchItem) {
  try {
    const parsed = watchSchema.safeParse(
      JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"),
    );
    const rows = parsed.success ? parsed.data : [];
    localStorage.setItem(
      WATCH_KEY,
      JSON.stringify(
        [item, ...rows.filter((r) => r.id !== item.id)].slice(0, 50),
      ),
    );
    window.dispatchEvent(new Event("jwalamala-local"));
  } catch {}
}
