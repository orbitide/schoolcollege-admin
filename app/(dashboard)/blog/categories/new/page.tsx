import type { Metadata } from "next"

import { CATEGORY_RESOURCE } from "@/components/blog/blog-shared"
import { CategoryForm } from "@/components/blog/category-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Add Category · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function NewCategoryPage({ searchParams }: PageProps<"/blog/categories/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource={CATEGORY_RESOURCE} surface={["Admin", "Manage"]}>
      <CategoryForm
        initialInstituteId={Number(one(query.institute)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
