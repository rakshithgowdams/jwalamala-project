import { editorChoices } from "@/lib/v4/editor-choices";
import { requireStaff } from "@/lib/auth/require-user";
import { LazyPostEditor as PostEditor } from "@/components/ui/LazyComponents";
import { kn } from "@/content/strings.kn";
export default async function NewPost() {
  const { db } = await requireStaff();
  const options = await editorChoices(db);
  const { data } = await db.from("categories").select("*").order("sort_order");
  return (
    <>
      <div className="page-heading">
        <h1>{kn.newPost}</h1>
      </div>
      <PostEditor categories={data || []} {...options} />
    </>
  );
}
