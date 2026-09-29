import type { Metadata } from "next"

import { POST_RESOURCE } from "@/components/blog/blog-shared"
import { PostForm } from "@/components/blog/post-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit Post · SMS Admin",
}

export default async function EditPostPage({ params, searchParams }: PageProps<"/blog/posts/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={POST_RESOURCE} surface={["Admin", "Manage"]}>
      <PostForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
