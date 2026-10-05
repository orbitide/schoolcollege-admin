import type { Metadata } from "next"
import { Suspense } from "react"

import { ShiftDetail } from "@/components/shifts/shift-detail"

export const metadata: Metadata = {
  title: "Shift details · SMS Admin",
}

export default async function ShiftDetailPage({ params }: PageProps<"/basic-settings/shifts/[id]">) {
  const { id } = await params

  return (
    <Suspense>
      <ShiftDetail id={Number(id)} />
    </Suspense>
  )
}
