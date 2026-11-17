import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { AccessRequestBoard } from "@/components/admin/AccessRequestBoard";
import type { AccessRequestRow } from "@/app/admin/access-requests/actions";
import { allSections } from "@/lib/admin/sections";
import { deskBase } from "@/lib/auth/paths";

function accessSectionLabel(key: string) {
  const found = allSections.find((s) => s.key === key);
  return found?.label || { en: key, kn: key, hi: key };
}

type JoinRow = {
  id: string;
  requester_id: string;
  section_key: string;
  status: string;
  staff_note: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function AccessRequestsPage() {
  const [{ user, profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const isAdmin = profile.role === "admin";
  if (!isAdmin) redirect(deskBase("staff"));

  const server = getAdminClient() || db;
  const [staffRes, requestsRes] = await Promise.all([
    server.from("profiles").select("id,full_name").eq("role", "staff").order("full_name"),
    server
      .from("staff_access_requests")
      .select(
        "id,requester_id,section_key,status,staff_note,admin_note,created_at,reviewed_at,profiles!requester_id(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (requestsRes.error) {
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Access requests", kn: "ಪ್ರವೇಶ ವಿನಂತಿಗಳು", hi: "पहुँच अनुरोध" })}</h1>
        </div>
        <p role="alert">
          {tr({
            en: "Access requests are not set up yet. Run supabase/migrations/20261116180000_staff_access_requests.sql in the Supabase SQL Editor, then reload.",
            kn: "ಪ್ರವೇಶ ವಿನಂತಿಗಳು ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ. Supabase SQL Editor ನಲ್ಲಿ supabase/migrations/20261116180000_staff_access_requests.sql ರನ್ ಮಾಡಿ.",
            hi: "पहुँच अनुरोध अभी सेट नहीं हैं। Supabase SQL Editor में supabase/migrations/20261116180000_staff_access_requests.sql चलाएँ।",
          })}
        </p>
      </>
    );
  }

  const requests: AccessRequestRow[] = ((requestsRes.data || []) as JoinRow[]).map((row) => {
    const person = one(row.profiles);
    return {
      id: row.id,
      sectionKey: row.section_key,
      sectionLabel: accessSectionLabel(row.section_key),
      status: row.status,
      staffNote: row.staff_note || "",
      adminNote: row.admin_note || "",
      requesterId: row.requester_id,
      requesterName: person?.full_name || "Staff",
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    };
  });

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Access requests", kn: "ಪ್ರವೇಶ ವಿನಂತಿಗಳು", hi: "पहुँच अनुरोध" })}</h1>
      </div>
      <AccessRequestBoard
        isAdmin
        requests={requests}
        staff={(staffRes.data || []).map((s) => ({
          id: s.id,
          name: s.full_name || s.id,
        }))}
      />
    </>
  );
}
