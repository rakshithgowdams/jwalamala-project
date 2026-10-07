"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
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
