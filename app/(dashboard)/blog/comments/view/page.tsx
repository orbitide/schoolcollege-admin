import type { Metadata } from "next"
import { Suspense } from "react"

import { COMMENT_RESOURCE } from "@/components/blog/blog-shared"
import { CommentList } from "@/components/blog/comment-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "View Comments · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function CommentsViewPage() {
  return (
    <RequireSurface resource={COMMENT_RESOURCE} surface="View">
      <Suspense>
        <CommentList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
