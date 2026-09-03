import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { utcToLocalInput } from "@/lib/time";
import { PostForm } from "@/components/admin/PostForm";

export default async function NewPostPage() {
  await requireAdmin();
  const initial = { status: "draft", publish_at: utcToLocalInput(new Date().toISOString()) };
  return (
    <>
      <h1>Write a news post</h1>
      <PostForm id={null} initial={initial} categories={await listCategories("post")} />
    </>
  );
}
