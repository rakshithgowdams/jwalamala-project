"use client";
import dynamic from "next/dynamic";
import { LoadingState } from "./LoadingState";

const panel = () => <LoadingState kind="panel" />;
export const LazyValueChart = dynamic(
  () => import("@/components/widgets/ValueChart").then((m) => m.ValueChart),
  { loading: panel },
);
export const LazyPostEditor = dynamic(
  () => import("@/components/admin/PostEditor").then((m) => m.PostEditor),
  { loading: () => <LoadingState kind="editor" />, ssr: false },
);
