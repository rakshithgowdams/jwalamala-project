import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { TaskRequestBoard } from "@/components/admin/TaskRequestBoard";
import type { TaskRequestRow } from "@/app/admin/task-requests/actions";

type PostJoin = {
  title_kn: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  status: string | null;
  slug: string | null;
};

type RequestJoinRow = {
  id: string;
  task_id: string;
  post_id: string;
  requester_id: string;
  status: string;
  staff_note: string | null;
  admin_note: string | null;
  drive_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  ready_at: string | null;
  posts: PostJoin | PostJoin[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function TaskRequestsPage() {
  const [{ user, profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const isAdmin = profile.role === "admin";
  const server = getAdminClient() || db;

  const [staffRes, requestsRes] = await Promise.all([
    isAdmin
      ? server.from("profiles").select("id,full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    (() => {
      let q = server
        .from("article_task_requests")
        .select(
          "id,task_id,post_id,requester_id,status,staff_note,admin_note,drive_url,created_at,reviewed_at,ready_at,posts(title_kn,thumbnail_url,video_url,status,slug),profiles!requester_id(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 200 : 100);
      if (!isAdmin) q = q.eq("requester_id", user.id);
      return q;
    })(),
  ]);

  if (requestsRes.error) {
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Task requests", kn: "ಕಾರ್ಯ ವಿನಂತಿಗಳು", hi: "कार्य अनुरोध" })}</h1>
        </div>
        <p role="alert">
          {tr({
            en: "Task requests are not set up yet. Run supabase/migrations/20261116170000_article_task_requests.sql in the Supabase SQL Editor for project aukaaveugptginqbpwwb, then reload.",
            kn: "ಕಾರ್ಯ ವಿನಂತಿಗಳು ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ. aukaaveugptginqbpwwb ಪ್ರಾಜೆಕ್ಟ್‌ನ SQL Editor ನಲ್ಲಿ supabase/migrations/20261116170000_article_task_requests.sql ರನ್ ಮಾಡಿ.",
            hi: "कार्य अनुरोध अभी सेट नहीं हैं। प्रोजेक्ट aukaaveugptginqbpwwb के SQL Editor में supabase/migrations/20261116170000_article_task_requests.sql चलाएँ।",
          })}
        </p>
      </>
    );
  }

  const rows = (requestsRes.data || []) as RequestJoinRow[];
  const requests: TaskRequestRow[] = rows.map((row) => {
    const post = one(row.posts);
    const person = one(row.profiles);
    return {
      id: row.id,
      taskId: row.task_id,
      postId: row.post_id,
      title: post?.title_kn || row.post_id,
      thumbnail: post?.thumbnail_url || null,
      videoUrl: post?.video_url || null,
      postStatus: post?.status || "",
      slug: post?.slug || null,
      status: row.status,
      staffNote: row.staff_note || "",
      adminNote: row.admin_note || "",
      driveUrl: row.drive_url || "",
      requesterId: row.requester_id,
      requesterName: person?.full_name || "Staff",
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      readyAt: row.ready_at,
    };
  });

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Task requests", kn: "ಕಾರ್ಯ ವಿನಂತಿಗಳು", hi: "कार्य अनुरोध" })}</h1>
      </div>
      <TaskRequestBoard
        isAdmin={isAdmin}
        requests={requests}
        staff={(staffRes.data || []).map((s) => ({
          id: s.id,
          name: s.full_name || s.id,
        }))}
      />
    </>
  );
}
