import type { Metadata } from "next"
import { Suspense } from "react"

import { SeatPlanForm } from "@/components/term-exams/seat-plan-form"

export const metadata: Metadata = {
  title: "Edit Exam Seat Plan · SMS Admin",
}

export default async function EditSeatPlanPage({ params }: PageProps<"/term-exam/seat-plans/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <SeatPlanForm planId={Number(id)} />
    </Suspense>
  )
}
