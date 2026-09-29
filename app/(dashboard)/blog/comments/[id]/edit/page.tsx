import type { Metadata } from "next"

import { COMMENT_RESOURCE } from "@/components/blog/blog-shared"
import { CommentForm } from "@/components/blog/comment-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit Comment · SMS Admin",
}

export default async function EditCommentPage({ params, searchParams }: PageProps<"/blog/comments/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={COMMENT_RESOURCE} surface={["Admin", "Manage"]}>
      <CommentForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
