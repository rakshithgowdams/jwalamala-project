import { getSetting } from "@/lib/v4/settings";
import { adSettingsSchema, defaultAds } from "@/lib/ads/schema";
export async function GET() {
  const settings = adSettingsSchema
    .catch(defaultAds)
    .parse((await getSetting("ads")) || {});
  const valid = settings.ads_txt
    .split("\n")
    .filter((line) =>
      /^google\.com,\s*pub-\d{16},\s*(DIRECT|RESELLER),\s*[a-f0-9]{16}$/i.test(
        line.trim(),
      ),
    );
  return new Response(valid.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
