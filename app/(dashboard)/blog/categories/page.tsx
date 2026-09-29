import type { Metadata } from "next"
import { Suspense } from "react"

import { CATEGORY_RESOURCE } from "@/components/blog/blog-shared"
import { CategoryList } from "@/components/blog/category-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Manage Category · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function CategoriesManagePage() {
  return (
    <RequireSurface resource={CATEGORY_RESOURCE} surface="Manage">
      <Suspense>
        <CategoryList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
