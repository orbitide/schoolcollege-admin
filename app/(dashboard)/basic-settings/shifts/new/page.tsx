import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftForm } from "@/components/shifts/shift-form"

export const metadata: Metadata = {
  title: "Add shift · SMS Admin",
}

export default function NewShiftPage() {
  return (
    <Suspense>
      <ShiftForm />
    </Suspense>
  )
}
