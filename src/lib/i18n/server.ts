import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { uiStrings, isLocale } from "./strings";
export const getUiStrings = cache(async () => {
  const cookie = (await cookies()).get("jwalamala-language")?.value;
  return uiStrings(isLocale(cookie) ? cookie : "kn");
});
