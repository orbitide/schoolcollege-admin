"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RotateCwIcon } from "lucide-react"

import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { setUserOnline } from "@/lib/global-settings"
import { loadInstitutes } from "@/lib/institutes-store"
import { loadNavigation } from "@/lib/navigation"
import {
  CurrentUserContext,
  fetchCurrentUser,
  setStampUser,
  type CurrentUser,
} from "@/lib/current-user"
import { ApiError } from "@/lib/http-client"

// Shows the panel only when the backend says someone is signed in: on load it
// asks GET /auth/me (the API checks its own session cookie). A user coming
// back means signed in, and is provided to every page below; a 401 sends the
// browser to the login page, which returns here after signing in.
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  // Why the API couldn't answer (no server, no database), shown with Reload.
  const [unreachable, setUnreachable] = React.useState<string | null>(null)
  const [reloading, setReloading] = React.useState(false)

  React.useEffect(() => {
    let active = true
    fetchCurrentUser()
      .then(async (found) => {
        if (!active) return
        if (found) {
          // Every page works inside the user's institutes, and the sidebar
          // needs the API's menus, so both load first.
          await Promise.all([loadInstitutes(), loadNavigation()])
          if (!active) return
          setUnreachable(null)
          setStampUser(found)
          // The Users page's Online dot (in-memory until the users API).
          setUserOnline(found.id, true)
          setUser(found)
          return
        }
        const back = `${window.location.pathname}${window.location.search}`
        router.replace(back === "/dashboard" ? "/login" : `/login?returnUrl=${encodeURIComponent(back)}`)
      })
      .catch((error) => {
        if (!active) return
        setUnreachable(
          error instanceof ApiError && error.status !== 0
            ? error.message
            : "Can't reach the server. Check that the API is running, then reload."
        )
      })
    return () => {
      active = false
    }
  }, [router])

  if (unreachable) {
    return (
      <div role="alert" className="m-auto flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {unreachable}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={reloading}
          onClick={() => {
            // A full page load, so nothing from the failed attempt survives.
            setReloading(true)
            window.location.reload()
          }}
        >
          <RotateCwIcon className={reloading ? "animate-spin" : undefined} />
          {reloading ? "Reloading…" : "Reload"}
        </Button>
      </div>
    )
  }

  return user ? (
    <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
  ) : (
    <PageLoader fullScreen label="Loading your workspace" />
  )
}
