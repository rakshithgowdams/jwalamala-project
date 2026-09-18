import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthMethods } from "@/lib/auth/settings";
import { getUiStrings } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.createAccount,
    robots: { index: false, follow: false },
  };
}

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="container page-shell">
      <LoginForm
        next={next || "/account"}
        initialMode="signup"
        methods={await getAuthMethods()}
      />
    </div>
  );
}
