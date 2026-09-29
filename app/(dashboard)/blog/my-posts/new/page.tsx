import type { Metadata } from "next"

import { AUTHOR_RESOURCE } from "@/components/blog/blog-shared"
import { PostForm } from "@/components/blog/post-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Create Post · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function CreateMyPostPage({ searchParams }: PageProps<"/blog/my-posts/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource={AUTHOR_RESOURCE} surface="Manage">
      <PostForm author
        initialInstituteId={Number(one(query.institute)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
