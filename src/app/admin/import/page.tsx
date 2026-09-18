import { requirePermission } from "@/lib/v4/permissions";
import { CsvImporter } from "@/components/admin/v4/CsvImporter";
export default async function Page() {
  const { db } = await requirePermission("content.edit");
  const { data } = await db
    .from("categories")
    .select("id,name_kn")
    .order("sort_order");
  return (
    <>
      <h1>CSV ಆಮದು</h1>
      <p>
        ಮೊದಲು ಕಾಲಮ್‌ಗಳನ್ನು ಹೊಂದಿಸಿ, ದೋಷಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಎಲ್ಲಾ ಲೇಖನಗಳು ಕರಡುಗಳಾಗಿ
        ಉಳಿಯುತ್ತವೆ.
      </p>
      <CsvImporter categories={data || []} />
    </>
  );
}
