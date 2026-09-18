import { z } from "zod";
export const THEME_KEY = "jwalamala-theme";
export const SCHEME_KEY = "jwalamala-scheme";
export const themeSchema = z.enum(["system", "light", "dark"]);
export const schemeSchema = z.enum(["light", "dark"]);
export type ThemePreference = z.infer<typeof themeSchema>;
export type ColorScheme = z.infer<typeof schemeSchema>;
export const themeOrder = ["system", "light", "dark"] as const;
/** A year of persistence, readable by the server on the next request. */
export function writeThemeCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000;samesite=lax`;
}
