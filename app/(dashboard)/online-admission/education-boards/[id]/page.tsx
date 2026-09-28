import type { Metadata } from "next"

import { EducationBoardDetail } from "@/components/online-admission/education-board-detail"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Education board details · SMS Admin",
}

export default async function EducationBoardDetailPage({
  params,
}: PageProps<"/online-admission/education-boards/[id]">) {
  const { id } = await params
  return (
    <RequireSurface resource="education-board" surface={["Admin", "Manage"]}>
      <EducationBoardDetail id={Number(id)} />
    </RequireSurface>
  )
}
