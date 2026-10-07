"use server";
import { requireUser } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import { z } from "zod";
export async function applyContributor(place: string, note: string) {
  const { db } = await requireUser("/account/contribute");
  const { kn: t } = await getUiStrings();
  if (
    !z.uuid().safeParse(place).success ||
    note.trim().length < 10 ||
    note.length > 2000
  )
    return { error: t.contributorDetailsNeeded };
  const { error } = await db.rpc("apply_contributor", { place, message: note });
  return { error: error ? t.contributorPhoneNeeded : "" };
}
