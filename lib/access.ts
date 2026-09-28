"use client"

import * as React from "react"

import { useCurrentUser } from "@/lib/current-user"
import type { UserRole } from "@/lib/global-settings"

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

export const surfaceHref = (baseUrl: string, surface: AccessSurface) =>
  `${baseUrl}${SURFACE_PATH[surface]}`

// Stable permission codes, e.g. "teacher.manage", "settings.academic-class.view".
export const permissionCode = (resource: string, surface: AccessSurface) =>
  `${resource}.${surface.toLowerCase()}`

// What each role may do until the API sends the caller's permission set.
const roleGrants: Record<UserRole, (code: string) => boolean> = {
  "Super Admin": () => true,
  "Institute Admin": () => true,
  "Institute Manager": (code) => code.endsWith(".manage") || code.endsWith(".view"),
  "Institute Viewer": (code) => code.endsWith(".view"),
  // A teacher works only on their own pages (e.g. Take Attendance), never
  // the admin surfaces.
  Teacher: () => false,
}

export function useCan() {
  const user = useCurrentUser()
  return React.useCallback((code: string) => roleGrants[user.role](code), [user.role])
}

// The surfaces of a resource the current user holds, Admin first.
export function useSurfaces(resource: string) {
  const can = useCan()
  return accessSurfaces.filter((surface) => can(permissionCode(resource, surface)))
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
