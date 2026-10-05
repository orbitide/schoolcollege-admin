import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftForm } from "@/components/shifts/shift-form"

export const metadata: Metadata = {
  title: "Edit shift · SMS Admin",
}

export default async function EditShiftPage({ params }: PageProps<"/basic-settings/shifts/[id]/edit">) {
  const { id } = await params

  return (
    <Suspense>
      <ShiftForm id={Number(id)} />
    </Suspense>
  )
}
