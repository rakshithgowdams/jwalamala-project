import { requireStaff } from "@/lib/auth/require-user";
import { getSectionAccess } from "@/lib/auth/section-access";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { site } from "@/config/site";
import "./admin-ui.css";
import "./dashboard.css";
export const metadata = {
  title: { default: "Admin", template: `%s | ${site.englishName} Admin` },
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ user, profile }, allowed] = await Promise.all([requireStaff(), getSectionAccess()]);
  return (
    <>
      <AdminTopBar
        name={(profile.full_name as string | null)?.trim() || user.email?.split("@")[0] || ""}
        email={user.email || ""}
        role={String(profile.role)}
      />
      <div className="container page-shell admin-layout">
        <AdminNav allowed={allowed} />
        <section className="admin-main">{children}</section>
      </div>
    </>
  );
}
