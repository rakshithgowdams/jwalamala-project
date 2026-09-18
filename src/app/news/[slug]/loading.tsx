import { LoadingState } from "@/components/ui/LoadingState";
export default function Loading() {
  return (
    <div className="container page-shell">
      <LoadingState kind="article" />
    </div>
  );
}
