import { ArticlePage, articleMetadata } from "@/components/news/ArticlePage";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  return articleMetadata((await params).slug, (await searchParams).lang);
}
export default async function Page({ params, searchParams }: Props) {
  return (
    <ArticlePage
      slug={(await params).slug}
      language={(await searchParams).lang}
    />
  );
}
