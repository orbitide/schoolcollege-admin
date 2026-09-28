import type { Metadata } from "next"
import { Suspense } from "react"

import { MenuViewConfiguration } from "@/components/configurations/menu-view-configuration"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Menu view configurations · SMS Admin",
}

// Saving needs the Manage (or Admin) surface of "menu-view-configuration".
// ?institute= picks the institute when the user has several, read from the
// URL in the page.
export default function Page() {
  return (
    <RequireSurface resource="menu-view-configuration" surface={["Admin", "Manage"]}>
      <Suspense>
        <MenuViewConfiguration />
      </Suspense>
    </RequireSurface>
  )
}
