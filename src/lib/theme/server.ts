import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { themeSchema, schemeSchema, THEME_KEY, SCHEME_KEY } from "./shared";

// The preference drives the toggle; the resolved scheme paints the first frame,
// because "system" cannot be evaluated on the server.
export const getTheme = cache(async () => {
  const jar = await cookies();
  return {
    preference: themeSchema.catch("system").parse(jar.get(THEME_KEY)?.value),
    scheme: schemeSchema.catch("light").parse(jar.get(SCHEME_KEY)?.value),
  };
});
