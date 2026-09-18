"use client";
import dynamic from "next/dynamic";
import { LoadingState } from "./LoadingState";
import { Deferred } from "./Deferred";

const panel = () => <LoadingState kind="panel" />;
const Comments = dynamic(
  () => import("@/components/engagement/Comments").then((m) => m.Comments),
  { loading: panel, ssr: false },
);
export function LazyComments({ postId }: { postId: string }) {
  return (
    <Deferred>
      <Comments key={postId} postId={postId} />
    </Deferred>
  );
}
export const LazyEventCalendar = dynamic(
  () =>
    import("@/components/events/EventCalendar").then((m) => m.EventCalendar),
  { loading: panel },
);
export const LazyJainCalendar = dynamic(
  () => import("@/components/widgets/JainCalendar").then((m) => m.JainCalendar),
  { loading: panel },
);
export const LazyGalleryViewer = dynamic(
  () =>
    import("@/components/content/GalleryViewer").then((m) => m.GalleryViewer),
  { loading: panel },
);
export const LazyValueChart = dynamic(
  () => import("@/components/widgets/ValueChart").then((m) => m.ValueChart),
  { loading: panel },
);
export const LazyPostEditor = dynamic(
  () => import("@/components/admin/PostEditor").then((m) => m.PostEditor),
  { loading: () => <LoadingState kind="editor" />, ssr: false },
);
