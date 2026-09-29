"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { setUserOnline, useAdminUsers } from "@/lib/global-settings"
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
  // Require Login (force logout, password reset) ends the session too.
  const allowed = user?.status === "Active" && !user.requireLogin
  // Whether someone was signed in here: then losing the session is a log
  // out (or a block), and the next user starts from the dashboard rather
  // than this page.
  const wasSignedIn = React.useRef(false)

  React.useEffect(() => {
    if (!hydrated) return
    if (allowed) {
      wasSignedIn.current = true
      // A session restored after a refresh is live again.
      if (userId != null) setUserOnline(userId, true)
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
