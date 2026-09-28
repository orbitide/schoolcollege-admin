"use client"

import Link from "next/link"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { permissionCode, useCan, type AccessSurface } from "@/lib/access"

// Shows the page only to users holding one of these surfaces of the
// resource. Hiding the menu link isn't enough: the URL can still be typed.
// Stands in for the API's permission check until the backend exists.
export function RequireSurface({
  resource,
  surface,
  children,
}: {
  resource: string
  surface: AccessSurface | AccessSurface[]
  children: React.ReactNode
}) {
  const can = useCan()
  const surfaces = Array.isArray(surface) ? surface : [surface]
  if (surfaces.some((s) => can(permissionCode(resource, s)))) return children

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LockIcon className="size-5" />
      </span>
      <h2 className="text-xl font-semibold">No access</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role doesn&apos;t allow this page. Ask an administrator if you need it.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
