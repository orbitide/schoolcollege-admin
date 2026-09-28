import type { Metadata } from "next"
import { Suspense } from "react"

import { AttendanceFineForm } from "@/components/attendance/attendance-fine-form"

export const metadata: Metadata = {
  title: "Monthly attendance fine · SMS Admin",
}

// Add and edit in one: the section and period come from the URL, and what
// is already saved for them is shown to change.
export default function AttendanceFineEntryPage() {
  return (
    <Suspense>
      <AttendanceFineForm />
    </Suspense>
  )
}
