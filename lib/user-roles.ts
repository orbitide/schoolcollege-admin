"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { reassignUsersRole } from "@/lib/global-settings"
import { httpClient } from "@/lib/http-client"
import { menuKeyInfo } from "@/lib/menu-keys"

// User roles (legacy NccPermission, Users/ManageUserRoles): a named bundle
// of permission codes (lib/access.ts) that users are given. Kept by the API
// (api/v1/roles, super admin only); this store caches the list for the role
// pages and pickers. The signed-in user's own role permissions come with
// /auth/me instead, so other users never need this list.

export type UserRoleRecord = {
  id: number
  name: string
  group: string
  description: string
  rank: number
  // Permission codes the role grants, or patterns: "*" is every code,
  // "*.manage" / "*.view" every code of that surface.
  permissions: string[]
  // Roles the code relies on by name (Super Admin, Teacher, ...): they
  // can't be renamed or deleted (ezducms isSystemDefault).
  builtIn: boolean
  // Users holding the role, as the API counts them.
  userCount: number
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type UserRoleInput = Pick<UserRoleRecord, "name" | "group" | "description" | "rank">

// Holds every permission whatever its list says, like a legacy superadmin.
export const SUPER_ADMIN_ROLE = "Super Admin"

let roles: UserRoleRecord[] = []
let loaded = false
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()
const noRoles: UserRoleRecord[] = []

function emit(next: UserRoleRecord[]) {
  logChanges("NccPermission", roles, next)
  roles = next
  listeners.forEach((listener) => listener())
}

// Loads the list once, the first time a role page or picker needs it.
function load() {
  loading ??= httpClient
    .get<UserRoleRecord[]>("/roles")
    .then((list) => {
      roles = list
      loaded = true
      listeners.forEach((listener) => listener())
    })
    .catch(() => {
      // Not a super admin, or the API is down: no roles to show. Try again next time.
      loading = undefined
    })
}

function subscribe(listener: () => void) {
  load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUserRoles() {
  return roles
}

export function useUserRoles() {
  return React.useSyncExternalStore(subscribe, () => roles, () => noRoles)
}

// Whether the list has arrived, so pages can wait rather than show "not found".
export function useUserRolesLoaded() {
  return React.useSyncExternalStore(subscribe, () => loaded, () => false)
}

// Role names in rank order, for role pickers.
export function useUserRoleNames() {
  const all = useUserRoles()
  return React.useMemo(
    () => [...all].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)).map((r) => r.name),
    [all]
  )
}

// The same rule as the API's PermissionRules.PatternsAllow: "*.view" grants
// the API's View pages (by their menu key's page) or an admin code ending in
// ".view". Platform pages are never granted by a wildcard, only by name.
export function roleAllows(role: Pick<UserRoleRecord, "name" | "permissions">, code: string) {
  if (role.name === SUPER_ADMIN_ROLE) return true
  const info = menuKeyInfo(code)
  const wildcards = info ? !info.platform : !code.startsWith("platform.")
  const ending = info ? `.${info.page.toLowerCase()}` : undefined
  return role.permissions.some(
    (p) =>
      p === code ||
      (wildcards && p === "*") ||
      (wildcards && p.startsWith("*.") && (ending ? p.slice(1) === ending : code.endsWith(p.slice(1))))
  )
}

// Whether the named role grants `code`; an unknown role grants nothing.
export function roleNameAllows(name: string, code: string) {
  const role = roles.find((r) => r.name === name)
  return role ? roleAllows(role, code) : false
}

export function nextRoleRank() {
  return Math.max(0, ...roles.map((r) => r.rank)) + 1
}

// A quick check before saving; the API checks the same and has the last word.
export function roleErrors(input: UserRoleInput, exceptId?: number) {
  const errors: Partial<Record<keyof UserRoleInput, string>> = {}
  const name = input.name.trim()
  if (!name) errors.name = "Name is required."
  else if (roles.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase()))
    errors.name = `Role '${name}' already exists.`
  if (!Number.isInteger(input.rank) || input.rank < 0) errors.rank = "Rank must be a whole number."
  return errors
}

function replace(role: UserRoleRecord) {
  emit(roles.map((r) => (r.id === role.id ? role : r)))
}

// Rejects with an ApiError (fieldErrors per input) when the API refuses.
export async function addUserRole(input: UserRoleInput) {
  const role = await httpClient.post<UserRoleRecord>("/roles", input)
  emit([...roles, role])
  return role
}

// A built-in role keeps its name (the API ignores a new one); renaming a
// custom role renames it on the in-memory users too.
export async function updateUserRole(id: number, input: UserRoleInput, by: string) {
  const before = roles.find((r) => r.id === id)
  const role = await httpClient.put<UserRoleRecord>(`/roles/${id}`, input)
  replace(role)
  if (before && role.name !== before.name) reassignUsersRole(before.name, role.name, by)
  return role
}

// Legacy SaveRolePermission / DeleteRolePermission, saved together. The API
// refuses the super admin role, whose permissions are fixed.
export async function saveRolePermissions(id: number, codes: string[]) {
  const role = await httpClient.put<UserRoleRecord>(`/roles/${id}/permissions`, { permissions: codes })
  replace(role)
  return role
}

// Legacy DeleteRole removes the role from its users; here every user has a
// role, so its users move to `moveTo` first (the API does both together).
export async function deleteUserRole(id: number, moveTo: string, by: string) {
  const role = roles.find((r) => r.id === id)
  await httpClient.delete(`/roles/${id}`, { params: moveTo ? { moveTo } : undefined })
  if (role && moveTo) reassignUsersRole(role.name, moveTo, by)
  emit(roles.filter((r) => r.id !== id))
}
