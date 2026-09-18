import { CommunityForm } from "@/components/community/CommunityForm";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { v4: t } = await getUiStrings();
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{t.submitOpportunity}</h1>
      </div>
      <CommunityForm kind="opportunity" />
    </div>
  );
}
