"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
export async function reviewContributor(
  user: string,
  decision: "approved" | "rejected",
) {
  const { db } = await requirePermission("users.manage");
  const { tr } = await getUiStrings();
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
    error: error
      ? tr({
          en: "Review failed; verify the phone and permissions.",
          kn: "ಪರಿಶೀಲನೆ ವಿಫಲವಾಯಿತು; ಫೋನ್ ಮತ್ತು ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
          hi: "समीक्षा विफल रही; फ़ोन और अनुमतियाँ जाँचें।",
        })
      : "",
  };
}
