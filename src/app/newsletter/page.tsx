import { NewsletterForm } from "@/components/engagement/NewsletterForm";
import { getUiStrings } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.newsletter };
}
export default async function Page() {
  const { v4: t } = await getUiStrings();
  return (
    <div className="container page-shell narrow">
      <h1>{t.newsletter}</h1>
      <NewsletterForm />
    </div>
  );
}
