import type { Metadata } from "next"

import { NoticeForm } from "@/components/notices/notice-form"
import { NOTICES_RESOURCE } from "@/components/notices/notice-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit notice · SMS Admin",
}

export default async function EditNoticePage({ params, searchParams }: PageProps<"/notices/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={NOTICES_RESOURCE} surface={["Admin", "Manage"]}>
      <NoticeForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
