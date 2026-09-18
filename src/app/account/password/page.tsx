import { requireUser } from "@/lib/auth/require-user";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { getUiStrings } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.newPassword,
    robots: { index: false, follow: false },
  };
}
export default async function PasswordPage() {
  await requireUser("/account/password");
  return (
    <div className="container page-shell">
      <UpdatePasswordForm />
    </div>
  );
}
