import type { Metadata } from "next"
import { Suspense } from "react"

import { CommonLogList } from "@/components/basic-actions/common-log-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Common Log · SMS Admin",
}

// Legacy CommonLog/Manage, a single page. ?tableName=&id=&uniqueKey= pre-fill
// the filters, read from the URL, which needs a Suspense boundary.
export default function CommonLogPage() {
  return (
    <RequireSurface resource="common-log" surface={["Admin", "Manage"]}>
      <Suspense>
        <CommonLogList />
      </Suspense>
    </RequireSurface>
  )
}
