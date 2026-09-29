import type { Metadata } from "next"

import { AUTHOR_RESOURCE } from "@/components/blog/blog-shared"
import { PostForm } from "@/components/blog/post-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit My Post · SMS Admin",
}

export default async function EditMyPostPage({ params, searchParams }: PageProps<"/blog/my-posts/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={AUTHOR_RESOURCE} surface="Manage">
      <PostForm author id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
