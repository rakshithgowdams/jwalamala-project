import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { TaskBoard, type BatchSummary, type TaskRow } from "@/components/admin/TaskBoard";

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

  const emptyCount = Promise.resolve({ count: 0 });
  function openAssignedCount(type: "article" | "video" | "short") {
    if (!isAdmin) return emptyCount;
    return server
      .from("article_tasks")
      .select("id, posts!inner(type)", { count: "exact", head: true })
      .eq("status", "open")
      .eq("posts.type", type);
  }
  const [
    { count: totalArticles },
    { count: articleCount },
    { count: videoCount },
    { count: shortCount },
    { count: openArticles },
    { count: openVideos },
    { count: openShorts },
    { count: staffOpenTotal },
    staffRes,
    tasksRes,
    openBatchRes,
  ] = await Promise.all([
    // Staff never see the assign UI — skip the expensive full-library count.
    isAdmin
      ? server.from("posts").select("id", { count: "exact", head: true }).neq("status", "archived")
      : emptyCount,
    isAdmin
      ? server.from("posts").select("id", { count: "exact", head: true }).neq("status", "archived").eq("type", "article")
      : emptyCount,
    isAdmin
      ? server.from("posts").select("id", { count: "exact", head: true }).neq("status", "archived").eq("type", "video")
      : emptyCount,
    isAdmin
      ? server.from("posts").select("id", { count: "exact", head: true }).neq("status", "archived").eq("type", "short")
      : emptyCount,
    openAssignedCount("article"),
    openAssignedCount("video"),
    openAssignedCount("short"),
    // Exact open total for staff — list queries are capped and must not under-count 700+ batches.
    !isAdmin
      ? server
          .from("article_tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .eq("assignee_id", user.id)
      : emptyCount,
    isAdmin
      ? server.from("profiles").select("id,full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    (() => {
      // Embed titles/names so we never .in() thousands of UUIDs (PostgREST Bad Request).
      // Staff cards are a sample; bulk work is summarized via openBatchRes below.
      let q = server
        .from("article_tasks")
        .select(
          "id,post_id,assignee_id,status,batch_label,notes,created_at,posts(title_kn,thumbnail_url,video_url,status,type,updated_at,slug),profiles!assignee_id(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(isAdmin ? 400 : 200);
      if (!isAdmin) q = q.eq("assignee_id", user.id);
      return q;
    })(),
    // Lightweight open-batch rollup so 1–1000 / 1001–2000 blocks stay visible even when
    // thousands of row cards cannot all be painted. Staff need this too, scoped to themselves.
    (() => {
      let q = server
        .from("article_tasks")
        .select("batch_label,assignee_id,created_at,notes")
        .eq("status", "open")
        .neq("batch_label", "")
        .order("created_at", { ascending: false })
        .limit(8000);
      if (!isAdmin) q = q.eq("assignee_id", user.id);
      return q;
    })(),
  ]);

  const totalsByType = {
    article: articleCount || 0,
    video: videoCount || 0,
    short: shortCount || 0,
  };
  const openByType = {
    article: openArticles || 0,
    video: openVideos || 0,
    short: openShorts || 0,
  };
  const remainingByType = {
    article: Math.max(0, totalsByType.article - openByType.article),
    video: Math.max(0, totalsByType.video - openByType.video),
    short: Math.max(0, totalsByType.short - openByType.short),
  };

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
          totalsByType={totalsByType}
          openByType={openByType}
          remainingByType={remainingByType}
          openTaskTotal={isAdmin ? 0 : staffOpenTotal || tasks.length}
          staff={(staffRes.data || []).map((s) => ({ id: s.id, name: s.full_name || s.id }))}
          tasks={tasks}
          batches={[]}
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

  const staffName = new Map(
    (staffRes.data || []).map((s) => [s.id as string, (s.full_name as string) || (s.id as string)]),
  );
  if (!isAdmin) {
    staffName.set(user.id, profile.full_name || "Staff");
  }
  const batchMap = new Map<string, BatchSummary>();
  for (const row of openBatchRes.data || []) {
    const batchLabel = (row.batch_label as string) || "";
    const assigneeId = row.assignee_id as string;
    if (!batchLabel || !assigneeId) continue;
    const key = `${assigneeId}::${batchLabel}`;
    const existing = batchMap.get(key);
    if (existing) {
      existing.count += 1;
      if (row.created_at && (!existing.createdAt || row.created_at > existing.createdAt)) {
        existing.createdAt = row.created_at as string;
      }
    } else {
      batchMap.set(key, {
        key,
        batchLabel,
        assigneeId,
        assigneeName: staffName.get(assigneeId) || profile.full_name || "Staff",
        count: 1,
        notes: (row.notes as string) || "",
        createdAt: (row.created_at as string) || "",
      });
    }
  }
  const batches = [...batchMap.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const openTaskTotal = isAdmin
    ? openByType.article + openByType.video + openByType.short
    : staffOpenTotal || 0;

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Tasks", kn: "ಕಾರ್ಯಗಳು", hi: "कार्य" })}</h1>
      </div>
      <TaskBoard
        isAdmin={isAdmin}
        totalArticles={totalArticles || 0}
        totalsByType={totalsByType}
        openByType={openByType}
        remainingByType={remainingByType}
        openTaskTotal={openTaskTotal}
        staff={(staffRes.data || []).map((s) => ({
          id: s.id,
          name: s.full_name || s.id,
        }))}
        tasks={tasks}
        batches={batches}
        activeRequests={activeRequests}
      />
    </>
  );
}
