import type { Metadata } from "next"

import { AUTHOR_RESOURCE } from "@/components/blog/blog-shared"
import { PostDetail } from "@/components/blog/post-detail"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "My Post · SMS Admin",
}

export default async function MyPostDetailPage({ params, searchParams }: PageProps<"/blog/my-posts/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={AUTHOR_RESOURCE} surface="Manage">
      <PostDetail author id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
