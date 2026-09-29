import type { Metadata } from "next"

import { POST_RESOURCE } from "@/components/blog/blog-shared"
import { PostDetail } from "@/components/blog/post-detail"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Post · SMS Admin",
}

export default async function PostDetailPage({ params, searchParams }: PageProps<"/blog/posts/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={POST_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <PostDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
