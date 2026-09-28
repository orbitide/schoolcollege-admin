import type { Metadata } from "next"

import { BoardStudentImport } from "@/components/online-admission/board-student-import"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Board Student Import · SMS Admin",
}

// Legacy StudentAdmission/ImportExcel, a single page.
export default function BoardStudentImportPage() {
  return (
    <RequireSurface resource="board-student-import" surface={["Admin", "Manage"]}>
      <BoardStudentImport />
    </RequireSurface>
  )
}
