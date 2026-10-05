import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftSurfaceList } from "@/components/shifts/shift-surface-list"

export const metadata: Metadata = {
  title: "Shift View · SMS Admin",
}

// Legacy Shift/ManageView.
export default function ShiftsViewPage() {
  return (
    <Suspense>
      <ShiftSurfaceList surface="View" />
    </Suspense>
  )
}
