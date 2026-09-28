import type { Metadata } from "next"
import { Suspense } from "react"

import { SeatPlanForm } from "@/components/term-exams/seat-plan-form"

export const metadata: Metadata = {
  title: "Generate Exam Seat Plan · SMS Admin",
}

// The exam and subject live in the URL, which needs a Suspense boundary on this otherwise static page.
export default function NewSeatPlanPage() {
  return (
    <Suspense>
      <SeatPlanForm />
    </Suspense>
  )
}
