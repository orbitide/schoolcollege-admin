import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SeatPlanList } from "@/components/seat-plans/seat-plan-list"

export const metadata: Metadata = {
  title: "Manage Exam Seat Plan · SMS Admin",
}

// The filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SeatPlansPage() {
  return (
    <RequireSurface resource="exam-seat-plan" surface={["Admin", "Manage"]}>
      <Suspense>
        <SeatPlanList />
      </Suspense>
    </RequireSurface>
  )
}
