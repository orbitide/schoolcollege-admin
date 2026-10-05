import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftSurfaceList } from "@/components/shifts/shift-surface-list"

export const metadata: Metadata = {
  title: "Shift Manage Admin · SMS Admin",
}

// Legacy Shift/ManageAdmin.
export default function ShiftsAdminPage() {
  return (
    <Suspense>
      <ShiftSurfaceList surface="Admin" />
    </Suspense>
  )
}
