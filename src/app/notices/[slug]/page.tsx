import { CommunityDetail } from "@/components/community/CommunityPage";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <CommunityDetail kind="notices" slug={(await params).slug} />;
}
