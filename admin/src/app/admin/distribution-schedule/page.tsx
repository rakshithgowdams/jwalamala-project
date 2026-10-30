import { requirePermission } from "@/lib/v4/permissions";
import { ScheduleControls } from "@/components/admin/v4/ScheduleControls";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const { tr } = await getUiStrings();
  const { data } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "distribution_schedule")
    .maybeSingle();
  return (
    <>
      <h1>
        {tr({
          en: "Bulletin draft schedule",
          kn: "ವಾರ್ತಾಪತ್ರ ಕರಡು ವೇಳಾಪಟ್ಟಿ",
          hi: "बुलेटिन ड्राफ़्ट समय-सारणी",
        })}
      </h1>
      <p>
        {tr({
          en: "Prepare morning and evening drafts from recent published stories. Each issue still requires editorial approval before sending.",
          kn: "ಇತ್ತೀಚೆಗೆ ಪ್ರಕಟವಾದ ಸುದ್ದಿಗಳಿಂದ ಬೆಳಗಿನ ಮತ್ತು ಸಂಜೆಯ ಕರಡುಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿ. ಪ್ರತಿ ಸಂಚಿಕೆಯನ್ನು ಕಳುಹಿಸುವ ಮೊದಲು ಸಂಪಾದಕೀಯ ಅನುಮೋದನೆ ಇನ್ನೂ ಅಗತ್ಯ.",
          hi: "हाल में प्रकाशित ख़बरों से सुबह और शाम के ड्राफ़्ट तैयार करें। भेजने से पहले हर अंक को संपादकीय स्वीकृति अब भी ज़रूरी है।",
        })}
      </p>
      <ScheduleControls
        initial={
          data?.value || {
            enabled: false,
            hours: [7, 18],
            networks: ["newsletter", "telegram"],
          }
        }
      />
    </>
  );
}
