import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { TestimonialReport } from "@/components/reports/testimonial-report"

export const metadata: Metadata = {
  title: "Testimonial · SMS Admin",
}

// Read-only, so any surface of "testimonial-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function TestimonialReportPage() {
  return (
    <RequireSurface resource="testimonial-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <TestimonialReport />
      </Suspense>
    </RequireSurface>
  )
}
