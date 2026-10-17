import { requireStaff } from "@/lib/auth/require-user";
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
  const { user, profile } = await requireStaff();
  return (
    <>
      <AdminTopBar email={user.email || ""} role={String(profile.role)} />
      <div className="container page-shell admin-layout">
        <AdminNav />
        <section className="admin-main">{children}</section>
      </div>
    </>
  );
}
