import type { Metadata } from "next"

import { EducationBoardForm } from "@/components/online-admission/education-board-form"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Add education board · SMS Admin",
}

export default function NewEducationBoardPage() {
  return (
    <RequireSurface resource="education-board" surface={["Admin", "Manage"]}>
      <EducationBoardForm />
    </RequireSurface>
  )
}
