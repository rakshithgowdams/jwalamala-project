import { CommunityList } from "@/components/community/CommunityPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    city?: string;
    district?: string;
    kind?: string;
    q?: string;
  }>;
}) {
  return <CommunityList kind="opportunities" filters={await searchParams} />;
}
