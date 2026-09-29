import type { Metadata } from "next"

import { InstitutesView } from "@/components/institutes/institutes-view"
import { RequirePlatform } from "@/components/require-platform"

export const metadata: Metadata = {
  title: "Institutes · SMS Admin",
}

// The platform's institute list: SaaS status, head counts and CSV export.
export default function InstitutesPlatformPage() {
  return (
    <RequirePlatform>
      <InstitutesView />
    </RequirePlatform>
  )
}
