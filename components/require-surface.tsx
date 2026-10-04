"use client"

import { NoAccess } from "@/components/no-access"
import { permissionCode, useCan, type AccessSurface } from "@/lib/access"

// Shows the page only to users holding one of these surfaces of the
// resource. Hiding the menu link isn't enough: the URL can still be typed.
// For modules still in the admin; a page on the API relies on its 403.
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
  return <NoAccess />
}
