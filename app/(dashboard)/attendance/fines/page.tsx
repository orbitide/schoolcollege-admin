import type { Metadata } from "next"
import { Suspense } from "react"

import { AttendanceFineList } from "@/components/attendance/attendance-fine-list"

export const metadata: Metadata = {
  title: "Monthly attendance fines · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary
// on this otherwise static page.
export default function AttendanceFinesPage() {
  return (
    <Suspense>
      <AttendanceFineList />
    </Suspense>
  )
}
