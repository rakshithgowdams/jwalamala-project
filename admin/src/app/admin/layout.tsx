import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth/require-user";
import { getSectionAccess } from "@/lib/auth/section-access";
import { deskBase } from "@/lib/auth/paths";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DeskPathProvider } from "@/components/admin/DeskPathProvider";
import { StaffChatNotifier } from "@/components/admin/StaffChatNotifier";
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
  const [{ user, profile }, allowed, headerList] = await Promise.all([
    requireStaff(),
    getSectionAccess(),
    headers(),
  ]);
  const role = String(profile.role);
  const fromHeader = headerList.get("x-desk-base");
  // Staff desk links must stay under /staff (tasks → /staff/tasks), never /admin.
  const basePath =
    role === "staff"
      ? "/staff"
      : fromHeader === "/staff" || fromHeader === "/admin"
        ? fromHeader
        : deskBase(role);
  return (
    <DeskPathProvider basePath={basePath}>
      <AdminTopBar
        name={(profile.full_name as string | null)?.trim() || user.email?.split("@")[0] || ""}
        email={user.email || ""}
        role={role}
        basePath={basePath}
      />
      <StaffChatNotifier userId={user.id} basePath={basePath} />
      <div className="container page-shell admin-layout">
        <AdminNav allowed={allowed} basePath={basePath} />
        <section className="admin-main">{children}</section>
      </div>
    </DeskPathProvider>
  );
}
