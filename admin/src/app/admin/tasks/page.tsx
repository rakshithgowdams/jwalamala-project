import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { TaskBoard, type TaskRow } from "@/components/admin/TaskBoard";

type PostJoin = {
  title_kn: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  status: string | null;
  type: string | null;
  updated_at: string | null;
  slug: string | null;
};

type TaskJoinRow = {
  id: string;
  post_id: string;
  assignee_id: string;
  status: string;
  batch_label: string | null;
  notes: string | null;
  created_at: string;
  posts: PostJoin | PostJoin[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function TasksPage() {
  const [{ user, profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const isAdmin = profile.role === "admin";
  const server = getAdminClient() || db;

  const [{ count: totalArticles }, staffRes, tasksRes] = await Promise.all([
    server.from("posts").select("id", { count: "exact", head: true }).neq("status", "archived"),
    isAdmin
      ? server.from("profiles").select("id,full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    (() => {
      // Embed titles/names so we never .in() thousands of UUIDs (PostgREST Bad Request).
      let q = server
        .from("article_tasks")
        .select(
          "id,post_id,assignee_id,status,batch_label,notes,created_at,posts(title_kn,thumbnail_url,video_url,status,type,updated_at,slug),profiles!assignee_id(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 200 : 100);
      if (!isAdmin) q = q.eq("assignee_id", user.id);
      return q;
    })(),
  ]);

  if (tasksRes.error) {
    // Fallback without embed aliases if the FK name differs.
    const fallback = await (() => {
      let q = server
        .from("article_tasks")
        .select("id,post_id,assignee_id,status,batch_label,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 200 : 100);
      if (!isAdmin) q = q.eq("assignee_id", user.id);
      return q;
    })();
    if (fallback.error) {
      return (
        <>
          <div className="section-title">
            <h1>{tr({ en: "Tasks", kn: "ಕಾರ್ಯಗಳು", hi: "कार्य" })}</h1>
          </div>
          <p role="alert">
            {tr({
              en: "Article tasks are not set up in the database yet. Run supabase/migrations/20261116150000_article_tasks.sql in the Supabase SQL Editor for project aukaaveugptginqbpwwb, then reload.",
              kn: "ಲೇಖನ ಕಾರ್ಯಗಳನ್ನು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇನ್ನೂ ಸಿದ್ಧಪಡಿಸಿಲ್ಲ. aukaaveugptginqbpwwb ಪ್ರಾಜೆಕ್ಟ್‌ನ SQL Editor ನಲ್ಲಿ supabase/migrations/20261116150000_article_tasks.sql ರನ್ ಮಾಡಿ.",
              hi: "लेख कार्य अभी डेटाबेस में सेट नहीं हैं। प्रोजेक्ट aukaaveugptginqbpwwb के SQL Editor में supabase/migrations/20261116150000_article_tasks.sql चलाएँ।",
            })}
          </p>
        </>
      );
    }
    const rows = (fallback.data || []) as {
      id: string;
      post_id: string;
      assignee_id: string;
      status: string;
      batch_label: string | null;
      notes: string | null;
      created_at: string;
    }[];
    const tasks: TaskRow[] = rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      title: row.post_id,
      thumbnail: null,
      videoUrl: null,
      postStatus: "",
      postType: "",
      updatedAt: null,
      slug: null,
      status: row.status,
      batchLabel: row.batch_label || "",
      notes: row.notes || "",
      assigneeId: row.assignee_id,
      assigneeName: "Staff",
      createdAt: row.created_at,
    }));
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Tasks", kn: "ಕಾರ್ಯಗಳು", hi: "कार्य" })}</h1>
        </div>
        <TaskBoard
          isAdmin={isAdmin}
          totalArticles={totalArticles || 0}
          staff={(staffRes.data || []).map((s) => ({ id: s.id, name: s.full_name || s.id }))}
          tasks={tasks}
        />
      </>
    );
  }

  const taskRows = (tasksRes.data || []) as TaskJoinRow[];
  const tasks: TaskRow[] = taskRows.map((row) => {
    const post = one(row.posts);
    const person = one(row.profiles);
    return {
      id: row.id,
      postId: row.post_id,
      title: post?.title_kn || row.post_id,
      thumbnail: post?.thumbnail_url || null,
      videoUrl: post?.video_url || null,
      postStatus: post?.status || "",
      postType: post?.type || "",
      updatedAt: post?.updated_at || null,
      slug: post?.slug || null,
      status: row.status,
      batchLabel: row.batch_label || "",
      notes: row.notes || "",
      assigneeId: row.assignee_id,
      assigneeName: person?.full_name || "Staff",
      createdAt: row.created_at,
    };
  });

  const openTaskIds = tasks.filter((t) => t.status === "open").map((t) => t.id);
  const activeRequests: Record<string, { id: string; status: string }> = {};
  if (openTaskIds.length) {
    const { data: requestRows } = await server
      .from("article_task_requests")
      .select("id,task_id,status")
      .in("task_id", openTaskIds)
      .in("status", ["requested", "processing", "ready"]);
    for (const row of requestRows || []) {
      activeRequests[row.task_id as string] = {
        id: row.id as string,
        status: row.status as string,
      };
    }
  }

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Tasks", kn: "ಕಾರ್ಯಗಳು", hi: "कार्य" })}</h1>
      </div>
      <TaskBoard
        isAdmin={isAdmin}
        totalArticles={totalArticles || 0}
        staff={(staffRes.data || []).map((s) => ({
          id: s.id,
          name: s.full_name || s.id,
        }))}
        tasks={tasks}
        activeRequests={activeRequests}
      />
    </>
  );
}
