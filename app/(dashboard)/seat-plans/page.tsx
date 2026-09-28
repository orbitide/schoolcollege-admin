import type { Metadata } from "next"
import { Suspense } from "react"

import { SeatPlanList } from "@/components/seat-plans/seat-plan-list"

export const metadata: Metadata = {
  title: "Manage Exam Seat Plan · SMS Admin",
}

// The filter lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function SeatPlansPage() {
  return (
    <Suspense>
      <SeatPlanList />
    </Suspense>
  )
}
