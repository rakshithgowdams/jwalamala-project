import {
  DiscoveryPage,
  discoveryMetadata,
} from "@/components/discovery/DiscoveryPage";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};
export async function generateMetadata({ params }: Props) {
  return discoveryMetadata("topic", (await params).slug);
}
export default async function Page({ params, searchParams }: Props) {
  return (
    <DiscoveryPage
      kind="topic"
      slug={(await params).slug}
      page={(await searchParams).page}
    />
  );
}
