import { requirePermission } from "@/lib/v4/permissions";
import { ProviderControls } from "@/components/admin/v4/ProviderControls";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const month =
    new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
      .slice(0, 7) + "-01";
  const [settings, usage, categories] = await Promise.all([
    db.from("provider_settings").select("*"),
    db.from("provider_usage").select("*").eq("month", month),
    db.from("categories").select("id,name_kn"),
  ]);
  if (settings.error) throw Error("Provider migration required");
  return (
    <>
      <h1>{t.providers}</h1>
      <ProviderControls
        rows={settings.data || []}
        usage={usage.data || []}
        categories={categories.data || []}
        configured={{
          weather: !!process.env.OPEN_METEO_API_KEY,
          tts: !!process.env.SARVAM_API_KEY,
          ai: !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL,
          email: !!process.env.RESEND_API_KEY && !!process.env.NEWSLETTER_FROM,
          social: !!process.env.SOCIAL_ENCRYPTION_KEY,
          push: !!process.env.VAPID_PRIVATE_KEY,
        }}
      />
    </>
  );
}
