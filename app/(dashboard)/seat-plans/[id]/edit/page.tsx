import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { SeatPlanForm } from "@/components/seat-plans/seat-plan-form"

export const metadata: Metadata = {
  title: "Edit Exam Seat Plan · SMS Admin",
}

export default async function EditSeatPlanPage({ params }: PageProps<"/seat-plans/[id]/edit">) {
  const { id } = await params

  return (
    <RequireSurface resource="exam-seat-plan" surface={["Admin", "Manage"]}>
      <Suspense>
        <SeatPlanForm planId={Number(id)} />
      </Suspense>
    </RequireSurface>
  )
}
