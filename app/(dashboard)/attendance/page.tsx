import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminAttendance } from "@/components/attendance/admin-attendance"

export const metadata: Metadata = {
  title: "Take attendance · SMS Admin",
}

// The page reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function AdminAttendancePage() {
  return (
    <Suspense>
      <AdminAttendance />
    </Suspense>
  )
}
