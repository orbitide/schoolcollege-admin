import type { Metadata } from "next"

import { NoticeForm } from "@/components/notices/notice-form"
import { NOTICES_RESOURCE } from "@/components/notices/notice-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Add notice · SMS Admin",
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function NewNoticePage({ searchParams }: PageProps<"/notices/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource={NOTICES_RESOURCE} surface={["Admin", "Manage"]}>
      <NoticeForm initialInstituteId={Number(one(query.institute)) || undefined} returnTo={one(query.returnTo)} />
    </RequireSurface>
  )
}
