import type { Metadata } from "next"
import { Suspense } from "react"

import { NOTICES_RESOURCE, NoticeList } from "@/components/notices/notice-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Notices · SMS Admin",
}

// The list reads its filters from the URL, which needs a Suspense boundary.
export default function Page() {
  return (
    <RequireSurface resource={NOTICES_RESOURCE} surface="Manage">
      <Suspense>
        <NoticeList surface="Manage" />
      </Suspense>
    </RequireSurface>
  )
}
