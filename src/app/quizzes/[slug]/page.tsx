import { notFound } from "next/navigation";
import { getV4Rows } from "@/lib/v4/queries";
import { QuizPlayer } from "@/components/engagement/QuizPlayer";
import { AdSlot } from "@/components/ads/AdSlot";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    quiz = (await getV4Rows("quizzes")).find(
      (q) => q.slug === slug && q.status === "published",
    );
  if (!quiz) notFound();
  return (
    <div className="container page-shell">
      <AdSlot placement="quiz-top" />
      <QuizPlayer quiz={quiz} />
      <AdSlot placement="quiz-bottom" />
    </div>
  );
}
