import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { getAuthMethods } from "@/lib/auth/settings";
import { adminReturnPath } from "@/lib/auth/paths";
import { signupSetupProblems } from "@/lib/auth/admin-signup";
export const metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};
export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const methods = await getAuthMethods();
  const problems = process.env.NODE_ENV === "development" && !methods.available
    ? signupSetupProblems().filter((problem) => !problem.includes("RESEND"))
    : [];
  return (
    <div className="admin-auth-shell">
      <AdminLoginForm next={adminReturnPath(next)} authError={error} methods={methods} problems={problems} />
    </div>
  );
}
