import type { Metadata } from "next"
import { Suspense } from "react"

import { CATEGORY_RESOURCE } from "@/components/blog/blog-shared"
import { CategoryList } from "@/components/blog/category-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "View Category · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function CategoriesViewPage() {
  return (
    <RequireSurface resource={CATEGORY_RESOURCE} surface="View">
      <Suspense>
        <CategoryList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
