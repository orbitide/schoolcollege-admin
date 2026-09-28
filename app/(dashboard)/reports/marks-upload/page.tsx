import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSurface } from "@/components/require-surface"
import { MarksUploadReport } from "@/components/reports/marks-upload-report"

export const metadata: Metadata = {
  title: "Marks Upload Report · SMS Admin",
}

// Read-only, so any surface of "marks-upload-report" may see it. The filter
// lives in the URL, which needs a Suspense boundary on this otherwise static page.
export default function MarksUploadReportPage() {
  return (
    <RequireSurface resource="marks-upload-report" surface={["Admin", "Manage", "View"]}>
      <Suspense>
        <MarksUploadReport />
      </Suspense>
    </RequireSurface>
  )
}
