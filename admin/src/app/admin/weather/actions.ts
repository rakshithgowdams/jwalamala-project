"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";

const coordinate = (min: number, max: number) =>
  z.union([z.literal("").transform(() => null), z.coerce.number().min(min).max(max)]);

/** Updates where a place's forecast is fetched for, and whether it is fetched at all. */
export async function saveWeatherPlace(input: unknown) {
  const { tr } = await getUiStrings();
  const parsed = z
    .object({
      id: z.uuid(),
      lat: coordinate(-90, 90),
      lng: coordinate(-180, 180),
      show_in_weather: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error: tr({
        en: "Latitude must be between -90 and 90, longitude between -180 and 180.",
        kn: "ಅಕ್ಷಾಂಶ -90 ರಿಂದ 90, ರೇಖಾಂಶ -180 ರಿಂದ 180 ರೊಳಗೆ ಇರಬೇಕು.",
        hi: "अक्षांश -90 से 90 और देशांतर -180 से 180 के बीच होना चाहिए।",
      }),
    };
  const p = parsed.data;
  if (p.show_in_weather && (p.lat === null || p.lng === null))
    return {
      error: tr({
        en: "Add the latitude and longitude before switching weather on.",
        kn: "ಹವಾಮಾನ ಆನ್ ಮಾಡುವ ಮೊದಲು ಅಕ್ಷಾಂಶ ಮತ್ತು ರೇಖಾಂಶ ಸೇರಿಸಿ.",
        hi: "मौसम चालू करने से पहले अक्षांश और देशांतर जोड़ें।",
      }),
    };
  const { db } = await requirePermission("settings.manage");
  const { data, error } = await db
    .from("places")
    .update({ lat: p.lat, lng: p.lng, show_in_weather: p.show_in_weather })
    .eq("id", p.id)
    .select("id");
  if (error || !data?.length)
    return {
      error: tr({ en: "Could not save.", kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ.", hi: "सहेजा नहीं जा सका।" }),
    };
  revalidatePath("/admin/weather");
  return { ok: true };
}
