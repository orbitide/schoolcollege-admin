import type { Metadata } from "next"
import { Suspense } from "react"

import { TAG_RESOURCE } from "@/components/blog/blog-shared"
import { TagList } from "@/components/blog/tag-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Manage Tags (Admin) · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function TagsAdminPage() {
  return (
    <RequireSurface resource={TAG_RESOURCE} surface="Admin">
      <Suspense>
        <TagList surface="Admin" />
      </Suspense>
    </RequireSurface>
  )
}
