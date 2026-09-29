import type { Metadata } from "next"

import { CATEGORY_RESOURCE } from "@/components/blog/blog-shared"
import { CategoryForm } from "@/components/blog/category-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit Category · SMS Admin",
}

export default async function EditCategoryPage({ params, searchParams }: PageProps<"/blog/categories/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={CATEGORY_RESOURCE} surface={["Admin", "Manage"]}>
      <CategoryForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
