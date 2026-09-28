import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SeatPlanForm } from "@/components/seat-plans/seat-plan-form"

export const metadata: Metadata = {
  title: "Generate Exam Seat Plan · SMS Admin",
}

// The exam and subject live in the URL, which needs a Suspense boundary on this otherwise static page.
export default function NewSeatPlanPage() {
  return (
    <RequireSurface resource="exam-seat-plan" surface={["Admin", "Manage"]}>
      <Suspense>
        <SeatPlanForm />
      </Suspense>
    </RequireSurface>
  )
}
