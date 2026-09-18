import Link from "next/link";
import { notFound } from "next/navigation";
import { getV4Rows } from "@/lib/v4/queries";
import { getUiStrings } from "@/lib/i18n/server";
import { StoryViewer } from "@/components/content/StoryViewer";
import { SampleNotice } from "@/components/ui/Primitives";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn } = await getUiStrings();
  const { slug } = await params;
  const story = (await getV4Rows("web_stories")).find(
    (row) => row.slug === slug,
  );
  if (!story || story.status !== "published") notFound();
  return (
    <div className="container page-shell">
      {story.is_seed && <SampleNotice />}
      <div className="page-heading">
        <h1>{story.title_kn}</h1>
      </div>
      <StoryViewer story={story} />
      <Link className="chip" href={"/stories/" + story.slug + "/amp"}>
        {kn.fullScreenStory}
      </Link>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    story = (await getV4Rows("web_stories")).find((s) => s.slug === slug);
  return {
    title: story?.title_kn,
    alternates: { canonical: "/stories/" + slug + "/amp" },
  };
}
