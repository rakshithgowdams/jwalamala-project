import { requirePermission } from "@/lib/v4/permissions";
import { CsvImporter } from "@/components/admin/v4/CsvImporter";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { db } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
  const { data } = await db
    .from("categories")
    .select("id,name_kn")
    .order("sort_order");
  return (
    <>
      <h1>{tr({ en: "CSV import", kn: "CSV ಆಮದು", hi: "CSV आयात" })}</h1>
      <p>
        {tr({
          en: "First map the columns and review the errors. All articles are saved as drafts.",
          kn: "ಮೊದಲು ಕಾಲಮ್‌ಗಳನ್ನು ಹೊಂದಿಸಿ, ದೋಷಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಎಲ್ಲಾ ಲೇಖನಗಳು ಕರಡುಗಳಾಗಿ ಉಳಿಯುತ್ತವೆ.",
          hi: "पहले कॉलम मिलाएँ और त्रुटियाँ जाँचें। सभी लेख ड्राफ़्ट के रूप में सहेजे जाते हैं।",
        })}
      </p>
      <CsvImporter categories={data || []} />
    </>
  );
}
