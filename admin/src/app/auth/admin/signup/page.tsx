import { AdminSignupForm } from "@/components/auth/AdminSignupForm";
import { signupSetupProblems } from "@/lib/auth/admin-signup";

export const metadata = {
  title: "Create Admin Account",
  robots: { index: false, follow: false },
};

export default function AdminSignupPage() {
  const problems = signupSetupProblems();
  return (
    <div className="admin-auth-shell">
      <AdminSignupForm
        configured={problems.length === 0}
        problems={process.env.NODE_ENV === "development" ? problems : []}
      />
    </div>
  );
}
