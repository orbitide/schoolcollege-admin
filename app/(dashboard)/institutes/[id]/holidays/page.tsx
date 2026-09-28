import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteHolidays } from "@/components/holidays/holiday-list"

export const metadata: Metadata = {
  title: "Holidays & events · SMS Admin",
}

export default async function HolidaysPage({
  params,
}: PageProps<"/institutes/[id]/holidays">) {
  const { id } = await params

  return (
    <Suspense>
      <InstituteHolidays instituteId={Number(id)} />
    </Suspense>
  )
}
