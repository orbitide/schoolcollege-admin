import type { Metadata } from "next"
import { Suspense } from "react"

import { ManageAdminList } from "@/components/institutes/academic/manage-admin-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Manage Building Room · SMS Admin",
}

// Legacy Buildings/ManageAdmin, under the Seat Plan menu: its only page, so
// buildings have no Manage or View surface. Buildings are added and edited
// on the institute's own form.
export default function BuildingsAdminPage() {
  return (
    <RequireSurface resource="building" surface="Admin">
      <Suspense>
        <ManageAdminList
          kind="buildings"
          resource="building"
          baseUrl="/seat-plans/buildings"
          surface="Admin"
        />
      </Suspense>
    </RequireSurface>
  )
}
