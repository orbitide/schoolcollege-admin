import type { Metadata } from "next"
import { Suspense } from "react"

import { POST_RESOURCE } from "@/components/blog/blog-shared"
import { PostList } from "@/components/blog/post-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Manage Post (Admin) · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function PostsAdminPage() {
  return (
    <RequireSurface resource={POST_RESOURCE} surface="Admin">
      <Suspense>
        <PostList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
