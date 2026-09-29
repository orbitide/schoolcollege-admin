import type { Metadata } from "next"

import { POST_RESOURCE } from "@/components/blog/blog-shared"
import { PostForm } from "@/components/blog/post-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "New Post · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function NewPostPage({ searchParams }: PageProps<"/blog/posts/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource={POST_RESOURCE} surface={["Admin", "Manage"]}>
      <PostForm
        initialInstituteId={Number(one(query.institute)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
