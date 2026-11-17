import { requirePermission } from "@/lib/v4/permissions";
import { ProgrammesBuilder } from "@/components/admin/v4/ProgrammesBuilder";
import {
  defaultProgrammesHub,
  parseProgrammesHub,
} from "@/lib/v4/programmes";
import { getUiStrings } from "@/lib/i18n/server";

export default async function Page() {
  const { db } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
  const settings = await db
    .from("site_settings")
    .select("value")
    .eq("key", "programmes_hub")
    .maybeSingle();
  if (settings.error) throw Error("Unable to load programmes hub");
  return (
    <>
      <h1>
        {tr({
          en: "Jwalamala programmes hub",
          kn: "ಜ್ವಾಲಾಮಾಲ ಕಾರ್ಯಕ್ರಮ ಕೇಂದ್ರ",
          hi: "ज्वालामाल कार्यक्रम केंद्र",
        })}
      </h1>
      <ProgrammesBuilder
        initial={parseProgrammesHub(
          settings.data?.value || defaultProgrammesHub,
        )}
      />
    </>
  );
}
