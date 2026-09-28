import type { Metadata } from "next"
import { Suspense } from "react"

import { FinePeriodConfiguration } from "@/components/attendance/fine-period-configuration"

export const metadata: Metadata = {
  title: "Absent fine date configuration · SMS Admin",
}

// ?institute= picks the institute when the user has several, read from the
// URL in the page.
export default function FinePeriodConfigurationPage() {
  return (
    <Suspense>
      <FinePeriodConfiguration />
    </Suspense>
  )
}
