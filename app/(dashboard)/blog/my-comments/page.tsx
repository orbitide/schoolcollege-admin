import type { Metadata } from "next"
import { Suspense } from "react"

import { MY_COMMENT_RESOURCE } from "@/components/blog/blog-shared"
import { CommentList } from "@/components/blog/comment-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "My Comments · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function MyCommentsPage() {
  return (
    <RequireSurface resource={MY_COMMENT_RESOURCE} surface="Manage">
      <Suspense>
        <CommentList surface="Manage" mine />
      </Suspense>
    </RequireSurface>
  )
}
