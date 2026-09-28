import type { Metadata } from "next"
import { Suspense } from "react"

import { HOLIDAYS_RESOURCE, HolidayList } from "@/components/holidays/holiday-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Holidays & Events (View) · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function HolidaysViewPage() {
  return (
    <RequireSurface resource={HOLIDAYS_RESOURCE} surface="View">
      <Suspense>
        <HolidayList surface="View" />
      </Suspense>
    </RequireSurface>
  )
}
