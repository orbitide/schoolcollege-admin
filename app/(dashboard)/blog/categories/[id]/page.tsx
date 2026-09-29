import type { Metadata } from "next"

import { CATEGORY_RESOURCE } from "@/components/blog/blog-shared"
import { CategoryDetail } from "@/components/blog/category-detail"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Category · SMS Admin",
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps<"/blog/categories/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={CATEGORY_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <CategoryDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
