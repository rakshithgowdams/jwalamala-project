import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";
export async function PreferredSource() {
  const { kn } = await getUiStrings();
  const value = process.env.NEXT_PUBLIC_PREFERRED_SOURCE_URL;
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    !["google.com", "www.google.com"].includes(url.hostname)
  )
    return null;
  return (
    <aside className="utility-panel">
      <p>{kn.preferredSourceNote}</p>
      <Link
        className="button button-outline"
        href={url.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        Preferred source · Google
      </Link>
    </aside>
  );
}
