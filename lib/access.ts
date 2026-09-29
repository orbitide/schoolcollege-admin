"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user"
import type { AdminUser, UserRole } from "@/lib/global-settings"
import { roleNameAllows, useUserRoles } from "@/lib/user-roles"

// The three ways into a resource (legacy ManageAdmin / Manage / ManageView,
// ezducms AccessSurface). Each is its own permission; a role just bundles
// them. Menus only point at the surfaces a user holds, they don't authorize.
export const accessSurfaces = ["Admin", "Manage", "View"] as const
export type AccessSurface = (typeof accessSurfaces)[number]

// Manage is the bare route; the others sit beside it (/teachers/admin).
export const SURFACE_PATH: Record<AccessSurface, string> = {
  Admin: "/admin",
  Manage: "",
  View: "/view",
}

// Resources whose legacy menu offers only some surfaces (e.g. Correct Answer
// has no ManageView); every other resource offers all three.
const resourceSurfaces: Record<string, readonly AccessSurface[]> = {
  "correct-answer": ["Admin", "Manage"],
  building: ["Admin"],
}

export const surfacesOf = (resource: string) => resourceSurfaces[resource] ?? accessSurfaces

export const surfaceHref = (baseUrl: string, surface: AccessSurface) =>
  `${baseUrl}${SURFACE_PATH[surface]}`

// Stable permission codes, e.g. "teacher.manage", "settings.academic-class.view".
export const permissionCode = (resource: string, surface: AccessSurface) =>
  `${resource}.${surface.toLowerCase()}`

// The role's grant as adjusted by the user's Extra Permission: a deny always
// wins, an allow adds. A super admin holds everything (legacy superadmins
// bypass permission checks).
export function grants(user: Pick<AdminUser, "role" | "extraAllow" | "extraDeny">, code: string) {
  if (user.role === "Super Admin") return true
  if (user.extraDeny.includes(code)) return false
  return user.extraAllow.includes(code) || roleNameAllows(user.role, code)
}

// What a role gives, before any user's Extra Permission (Manage User Roles).
export function roleGrantsCode(role: UserRole, code: string) {
  return roleNameAllows(role, code)
}

export function useCan() {
  const user = useCurrentUser()
  // Re-checks when a role's permissions change (Manage User Roles).
  const roles = useUserRoles()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback((code: string) => grants(user, code), [user, roles])
}

// The surfaces of a resource the current user holds, Admin first.
export function useSurfaces(resource: string) {
  const can = useCan()
  return surfacesOf(resource).filter((surface) => can(permissionCode(resource, surface)))
}

// The actions a surface offers on its rows (ezducms SurfaceMeta
// capabilities). Retiring records (delete, retrieve, deleted rows) is Admin
// only; View is read-only.
export type Capabilities = {
  create: boolean
  edit: boolean
  status: boolean
  reorder: boolean
  delete: boolean
  restore: boolean
}

export function capabilitiesFor(surface: AccessSurface): Capabilities {
  const manage = surface !== "View"
  const admin = surface === "Admin"
  return {
    create: manage,
    edit: manage,
    status: manage,
    reorder: manage,
    delete: admin,
    restore: admin,
  }
}
