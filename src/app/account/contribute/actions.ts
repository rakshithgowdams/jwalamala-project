"use server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/v4/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
export async function applyContributor(place: string, note: string) {
  const { db } = await requireUser("/account/contribute");
  if (
    !z.uuid().safeParse(place).success ||
    note.trim().length < 10 ||
    note.length > 2000
  )
    return { error: "Select a place and describe your reporting experience." };
  const { error } = await db.rpc("apply_contributor", { place, message: note });
  return {
    error: error
      ? "Phone OTP verification is required. Check your details and try again."
      : "",
  };
}
export async function reviewContributor(
  user: string,
  decision: "approved" | "rejected",
) {
  const { db } = await requirePermission("users.manage");
  if (
    !z.uuid().safeParse(user).success ||
    !["approved", "rejected"].includes(decision)
  )
    throw Error("Invalid decision");
  const { error } = await db.rpc("review_contributor", {
    target: user,
    decision,
  });
  revalidatePath("/admin/contributors");
  return {
    error: error ? "Review failed; verify the phone and permissions." : "",
  };
}
