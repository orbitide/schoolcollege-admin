import type { Metadata } from "next"

import { EducationBoardList } from "@/components/online-admission/education-board-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Education Board · SMS Admin",
}

// Legacy EducationBoard/Manage: one page, no ManageAdmin / ManageView.
export default function EducationBoardsPage() {
  return (
    <RequireSurface resource="education-board" surface={["Admin", "Manage"]}>
      <EducationBoardList />
    </RequireSurface>
  )
}
