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

// Shows the panel only when the backend says someone is signed in: on load it
// asks GET /auth/me (the API checks its own session cookie). A user coming
// back means signed in, and is provided to every page below; a 401 sends the
// browser to the login page, which returns here after signing in.
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [unreachable, setUnreachable] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  // Bumped by Reload to ask the API again.
  const [attempt, setAttempt] = React.useState(0)

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
          setUnreachable(false)
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
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [router, attempt])

  if (unreachable) {
    return (
      <div role="alert" className="m-auto flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Can&apos;t reach the server. Check that the API is running, then reload.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={checking}
          onClick={() => {
            setChecking(true)
            setAttempt((n) => n + 1)
          }}
        >
          <RotateCwIcon className={checking ? "animate-spin" : undefined} />
          {checking ? "Reloading…" : "Reload"}
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
