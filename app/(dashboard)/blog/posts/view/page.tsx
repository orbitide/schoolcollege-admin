import type { Metadata } from "next"
import { Suspense } from "react"

import { POST_RESOURCE } from "@/components/blog/blog-shared"
import { PostList } from "@/components/blog/post-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "View Post · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function PostsViewPage() {
  return (
    <RequireSurface resource={POST_RESOURCE} surface="View">
      <Suspense>
        <PostList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
