import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { uiStrings, isLocale, LANGUAGE_COOKIE, DEFAULT_LOCALE } from "./strings";
export const getUiStrings = cache(async () => {
  const cookie = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return uiStrings(isLocale(cookie) ? cookie : DEFAULT_LOCALE);
});
