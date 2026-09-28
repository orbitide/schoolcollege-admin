import type { Metadata } from "next"
import { Suspense } from "react"

import { InstituteConfigurationPage } from "@/components/configurations/institute-configuration-page"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Institute configurations · SMS Admin",
}

// Saving needs the Manage (or Admin) surface of "institute-configuration".
// ?institute= picks the institute when the user has several, read from the
// URL in the page.
export default function Page() {
  return (
    <RequireSurface resource="institute-configuration" surface={["Admin", "Manage"]}>
      <Suspense>
        <InstituteConfigurationPage />
      </Suspense>
    </RequireSurface>
  )
}
