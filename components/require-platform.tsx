"use client"

import Link from "next/link"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"

// Shows a platform console page (pricing, subscriptions, users, audit
// logs) only to platform admins. Hiding the menu link isn't enough: the URL
// can still be typed. Stands in for the API's check until the backend
// exists.
export function RequirePlatform({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser()
  if (isPlatformAdmin(user)) return children

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LockIcon className="size-5" />
      </span>
      <h2 className="text-xl font-semibold">No access</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page is for the platform team only.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
