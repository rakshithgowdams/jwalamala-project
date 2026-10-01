import type { NextRequest } from "next/server";
import { z } from "zod";
import { pickAd } from "@/lib/ads/server";
import { requestIdentity, privateJson, limitRequest } from "@/lib/v4/server";
import { site } from "@/config/site";
import { getSetting } from "@/lib/v4/settings";
import { adSettingsSchema, defaultAds, routeAllowsAds } from "@/lib/ads/schema";
export async function GET(request: NextRequest) {
  const parsed = z
    .object({
      placement: z.string().regex(/^[a-z0-9_-]{1,100}$/),
      path: z.string().startsWith("/").max(300),
      device: z.enum(["mobile", "desktop"]),
      format: z.enum(["banner", "rectangle"]).default("banner"),
    })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return privateJson({ mode: "off" }, 400);
  const identity = await requestIdentity(request);
  if (!identity) {
    const config = adSettingsSchema
      .catch(defaultAds)
      .parse((await getSetting("ads")) || defaultAds);
    return privateJson({
      mode:
        site.demo &&
        config.enabled &&
        config.test_mode &&
        routeAllowsAds(parsed.data.path)
          ? "test"
          : "off",
    });
  }
  if (!(await limitRequest("ads-pick:" + identity.ipHash, 600)))
    return privateJson({ mode: "off" }, 429);
  const result = await pickAd(
    parsed.data.placement,
    parsed.data.path,
    parsed.data.device,
    identity.deviceHash,
    parsed.data.format,
  );
  const response = privateJson(result);
  response.cookies.set("jwalamala-device", identity.cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 31536000,
  });
  return response;
}
