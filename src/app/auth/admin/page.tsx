import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { getAuthMethods } from "@/lib/auth/settings";
import { adminReturnPath } from "@/lib/auth/paths";
export const metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};
export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="admin-auth-shell">
      <AdminLoginForm next={adminReturnPath(next)} authError={error} methods={await getAuthMethods()} />
    </div>
  );
}
