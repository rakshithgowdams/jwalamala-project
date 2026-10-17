"use client";
import { deletePush } from "@/app/admin/push/actions";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export function PushDelete({ id }: { id: string }) {
  return <ConfirmDeleteButton action={() => deletePush(id)} />;
}
