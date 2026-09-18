import { requireUser } from "@/lib/auth/require-user";
import { ContributorApplication } from "@/components/engagement/ContributorApplication";
export default async function Page() {
  const { db, user } = await requireUser("/account/contribute");
  const [places, application] = await Promise.all([
    db.from("places").select("id,name_kn").order("name_kn"),
    db
      .from("contributor_applications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  return (
    <div className="container page-shell">
      <ContributorApplication
        places={places.data || []}
        status={application.data?.status}
      />
    </div>
  );
}
