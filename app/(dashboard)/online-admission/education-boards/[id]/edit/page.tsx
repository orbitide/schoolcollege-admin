import type { Metadata } from "next"

import { EducationBoardForm } from "@/components/online-admission/education-board-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit education board · SMS Admin",
}

export default async function EditEducationBoardPage({
  params,
}: PageProps<"/online-admission/education-boards/[id]/edit">) {
  const { id } = await params
  return (
    <RequireSurface resource="education-board" surface={["Admin", "Manage"]}>
      <EducationBoardForm id={Number(id)} />
    </RequireSurface>
  )
}
