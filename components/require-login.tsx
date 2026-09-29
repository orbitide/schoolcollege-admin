"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAdminUsers } from "@/lib/global-settings"
import { signOut, useSessionUserId } from "@/lib/current-user"

const noopSubscribe = () => () => {}

// Shows the panel only to a signed-in, active user; anyone else goes to the
// login page and comes back here after signing in. The session lives in the
// browser, so nothing renders until the page has hydrated.
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = React.useSyncExternalStore(noopSubscribe, () => true, () => false)
  const userId = useSessionUserId()
  const users = useAdminUsers()
  const user = users.find((u) => u.id === userId)
  const allowed = user?.status === "Active"
  // Whether someone was signed in here: then losing the session is a log
  // out (or a block), and the next user starts from the dashboard rather
  // than this page.
  const wasSignedIn = React.useRef(false)

  React.useEffect(() => {
    if (!hydrated) return
    if (allowed) {
      wasSignedIn.current = true
      return
    }
    // A blocked or removed user's session ends too.
    if (userId != null) signOut()
    const back = `${pathname}${window.location.search}`
    router.replace(
      wasSignedIn.current || back === "/dashboard"
        ? "/login"
        : `/login?returnUrl=${encodeURIComponent(back)}`
    )
  }, [hydrated, allowed, userId, pathname, router])

  return hydrated && allowed ? children : null
}
