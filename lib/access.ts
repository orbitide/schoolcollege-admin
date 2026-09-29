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
// capabilities). Legacy grants each page (ManageAdmin / Manage / ManageView)
// on its own, and each page's SubActions decide what it can do:
//
//             rows            create/edit/status/rank   delete   retrieve, permanent delete
//   Admin     incl. Deleted   yes                       yes      yes
//   Manage    not Deleted     yes                       soft     no
//   View      not Deleted     no (Details only)         no       no
//
// Manage deletes only where the record is soft-deleted (a Deleted status that
// Admin can retrieve); a hard delete stays on Admin. Every surface lists the
// user's own institutes (all of them for a super admin).
export type Capabilities = {
  create: boolean
  edit: boolean
  status: boolean
  reorder: boolean
  delete: boolean
  restore: boolean
}

// Where a resource's legacy page offers less than the table above.
const resourceCapabilities: Record<string, Partial<Record<AccessSurface, Partial<Capabilities>>>> = {
  // Legacy Manage has no Rank for these (older AcademicClass-style pages).
  "settings.classes": { Manage: { reorder: false } },
  "settings.class-subjects": { Manage: { reorder: false } },
  "settings.grades": { Manage: { reorder: false } },
  // Legacy Blog pages have no Rank; comments come from readers, not the
  // Comments page.
  "blog-post": { Admin: { reorder: false }, Manage: { reorder: false } },
  "blog-category": { Admin: { reorder: false }, Manage: { reorder: false } },
  "blog-tag": { Admin: { create: false, reorder: false }, Manage: { create: false, reorder: false } },
  "blog-comment": { Admin: { create: false, reorder: false }, Manage: { create: false, reorder: false } },
  // Notices are ordered by pin and publish date, not rank.
  notice: { Admin: { reorder: false }, Manage: { reorder: false } },
}

export type CapabilityOptions = {
  // Permission resource, for its overrides above.
  resource?: string
  // Whether delete marks the record Deleted (retrievable on Admin) rather
  // than removing it; only then may Manage delete.
  softDelete?: boolean
}

export function capabilitiesFor(
  surface: AccessSurface,
  { resource, softDelete = false }: CapabilityOptions = {}
): Capabilities {
  const manage = surface !== "View"
  const admin = surface === "Admin"
  return {
    create: manage,
    edit: manage,
    status: manage,
    reorder: manage,
    delete: admin || (manage && softDelete),
    restore: admin,
    ...(resource ? resourceCapabilities[resource]?.[surface] : undefined),
  }
}
