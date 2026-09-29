"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { setUserOnline } from "@/lib/global-settings"
import {
  CurrentUserContext,
  fetchCurrentUser,
  setStampUser,
  type CurrentUser,
} from "@/lib/current-user"

// Shows the panel only when the backend says someone is signed in: on load it
// asks GET /auth/me (the API checks its own session cookie). A user coming
// back means signed in, and is provided to every page below; a 401 sends the
// browser to the login page, which returns here after signing in.
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [unreachable, setUnreachable] = React.useState(false)

  React.useEffect(() => {
    let active = true
    fetchCurrentUser()
      .then((found) => {
        if (!active) return
        if (found) {
          setStampUser(found)
          // The Users page's Online dot (in-memory until the users API).
          setUserOnline(found.id, true)
          setUser(found)
          return
        }
        const back = `${window.location.pathname}${window.location.search}`
        router.replace(back === "/dashboard" ? "/login" : `/login?returnUrl=${encodeURIComponent(back)}`)
      })
      .catch(() => {
        if (active) setUnreachable(true)
      })
    return () => {
      active = false
    }
  }, [router])

  if (unreachable) {
    return (
      <p role="alert" className="m-auto p-6 text-center text-sm text-muted-foreground">
        Can&apos;t reach the server. Check that the API is running, then reload the page.
      </p>
    )
  }

  return user ? <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider> : null
}
