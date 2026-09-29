import type { Metadata } from "next"

import { NoticeDetail } from "@/components/notices/notice-detail"
import { NOTICES_RESOURCE } from "@/components/notices/notice-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Notice · SMS Admin",
}

export default async function NoticeDetailPage({ params, searchParams }: PageProps<"/notices/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={NOTICES_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <NoticeDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
