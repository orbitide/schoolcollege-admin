import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SeatPlanRoomWise } from "@/components/reports/seat-plan-room-wise"

export const metadata: Metadata = {
  title: "Seat Plan (Room Wise) · SMS Admin",
}

// Read-only, so any surface of "seat-plan-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SeatPlanRoomsPage() {
  return (
    <RequireSurface resource="seat-plan-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <SeatPlanRoomWise />
      </Suspense>
    </RequireSurface>
  )
}
