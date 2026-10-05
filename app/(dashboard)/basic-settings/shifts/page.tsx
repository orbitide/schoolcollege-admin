import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftSurfaceList } from "@/components/shifts/shift-surface-list"

export const metadata: Metadata = {
  title: "Shift Manage · SMS Admin",
}

// Legacy Shift/Manage.
export default function ShiftsManagePage() {
  return (
    <Suspense>
      <ShiftSurfaceList surface="Manage" />
    </Suspense>
  )
}
