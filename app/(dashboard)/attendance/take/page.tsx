import type { Metadata } from "next"
import { Suspense } from "react"

import { TeacherAttendance } from "@/components/attendance/teacher-attendance"

export const metadata: Metadata = {
  title: "Take attendance · SMS Admin",
}

// The page reads the section and day from the URL, which needs a Suspense
// boundary on this otherwise static page.
export default function TeacherAttendancePage() {
  return (
    <Suspense>
      <TeacherAttendance />
    </Suspense>
  )
}
