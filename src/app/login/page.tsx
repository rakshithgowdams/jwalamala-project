import { LoginForm } from "@/components/auth/LoginForm";
import { getUiStrings } from "@/lib/i18n/server";
import { getAuthMethods } from "@/lib/auth/settings";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.login,
    robots: { index: false, follow: false },
  };
}
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="container page-shell">
      <LoginForm
        next={next || "/account"}
        authError={!!error}
        methods={await getAuthMethods()}
      />
    </div>
  );
}
