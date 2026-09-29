"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { getAdminUsers, reassignUsersRole } from "@/lib/global-settings"

// User roles (legacy NccPermission, Users/ManageUserRoles): a named bundle
// of permission codes (lib/access.ts) that users are given. In-memory dummy
// store like the rest of admin; replace with API calls once the backend
// endpoints exist.

export type UserRoleRecord = {
  id: number
  name: string
  group: string
  description: string
  rank: number
  // Permission codes the role grants. The seeded roles use patterns until
  // their permissions are first saved: "*" is every code, "*.manage" /
  // "*.view" every code of that surface.
  permissions: string[]
  // Seeded roles the code relies on by name (Super Admin, Teacher, ...):
  // they can't be renamed or deleted (ezducms isSystemDefault).
  builtIn: boolean
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type UserRoleInput = Pick<UserRoleRecord, "name" | "group" | "description" | "rank">

// Holds every permission whatever its list says, like a legacy superadmin.
export const SUPER_ADMIN_ROLE = "Super Admin"

const seedStamp = {
  builtIn: true,
  createdBy: "Super Admin",
  createdAt: "2026-01-05T09:00:00.000Z",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-05T09:00:00.000Z",
}

const seedRoles: UserRoleRecord[] = [
  { id: 1, name: SUPER_ADMIN_ROLE, group: "Platform", description: "Runs the platform and every institute.", rank: 1, permissions: ["*"], ...seedStamp },
  { id: 2, name: "Institute Admin", group: "Institute", description: "Everything inside their institutes, including deleting records.", rank: 2, permissions: ["*"], ...seedStamp },
  { id: 3, name: "Institute Manager", group: "Institute", description: "Adds and edits records, and sees every page, but can't delete.", rank: 3, permissions: ["*.manage", "*.view"], ...seedStamp },
  { id: 4, name: "Institute Viewer", group: "Institute", description: "Read-only access to the view pages.", rank: 4, permissions: ["*.view"], ...seedStamp },
  // A teacher works only on their own pages (e.g. Take Attendance, My
  // Post), never the admin surfaces.
  { id: 5, name: "Teacher", group: "Teacher", description: "Signs in as a teacher to take attendance for their sections, see their routine and the notice board, write blog posts, add questions to the bank, and print and scan OMR sheets.", rank: 5, permissions: ["blog-author.manage", "blog-my-comment.manage", "teacher-routine.view", "notice-board.view", "question.manage", "question-chapter.view", "omr-sheet.view", "omr-scan.manage"], ...seedStamp },
]

let roles = seedRoles
const listeners = new Set<() => void>()

function emit(next: UserRoleRecord[]) {
  logChanges("NccPermission", roles, next)
  roles = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUserRoles() {
  return roles
}

export function useUserRoles() {
  return React.useSyncExternalStore(subscribe, () => roles, () => seedRoles)
}

// Role names in rank order, for role pickers.
export function useUserRoleNames() {
  const all = useUserRoles()
  return React.useMemo(
    () => [...all].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)).map((r) => r.name),
    [all]
  )
}

export function roleAllows(role: Pick<UserRoleRecord, "name" | "permissions">, code: string) {
  if (role.name === SUPER_ADMIN_ROLE) return true
  return role.permissions.some(
    (p) => p === code || p === "*" || (p.startsWith("*.") && code.endsWith(p.slice(1)))
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

export function roleErrors(input: UserRoleInput, exceptId?: number) {
  const errors: Partial<Record<keyof UserRoleInput, string>> = {}
  const name = input.name.trim()
  if (!name) errors.name = "Name is required."
  else if (roles.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase()))
    errors.name = `Role '${name}' already exists.`
  if (!Number.isInteger(input.rank) || input.rank < 0) errors.rank = "Rank must be a whole number."
  return errors
}

function fields(input: UserRoleInput) {
  return {
    name: input.name.trim(),
    group: input.group.trim(),
    description: input.description.trim(),
    rank: input.rank,
  }
}

export function addUserRole(input: UserRoleInput, by: string) {
  const now = new Date().toISOString()
  const role: UserRoleRecord = {
    id: Math.max(0, ...roles.map((r) => r.id)) + 1,
    ...fields(input),
    permissions: [],
    builtIn: false,
    createdBy: by,
    createdAt: now,
    modifiedBy: by,
    modifiedAt: now,
  }
  emit([...roles, role])
  return role
}

function patch(id: number, changes: Partial<UserRoleRecord>, by: string) {
  emit(roles.map((r) => (r.id === id ? { ...r, ...changes, modifiedBy: by, modifiedAt: new Date().toISOString() } : r)))
}

// A built-in role keeps its name; renaming a custom role renames it on its
// users too.
export function updateUserRole(id: number, input: UserRoleInput, by: string) {
  const role = roles.find((r) => r.id === id)
  if (!role) return
  const next = fields(input)
  if (role.builtIn) next.name = role.name
  patch(id, next, by)
  if (next.name !== role.name) reassignUsersRole(role.name, next.name, by)
}

// Legacy SaveRolePermission / DeleteRolePermission, saved together. The
// super admin role's permissions are fixed.
export function saveRolePermissions(id: number, codes: string[], by: string) {
  const role = roles.find((r) => r.id === id)
  if (!role || role.name === SUPER_ADMIN_ROLE) return
  patch(id, { permissions: [...new Set(codes)].sort() }, by)
}

export function roleUserCount(name: string) {
  return getAdminUsers().filter((u) => u.role === name).length
}

// Legacy DeleteRole removes the role from its users; here every user has a
// role, so its users move to `moveTo` first.
export function deleteUserRole(id: number, moveTo: string, by: string) {
  const role = roles.find((r) => r.id === id)
  if (!role || role.builtIn) return
  reassignUsersRole(role.name, moveTo, by)
  emit(roles.filter((r) => r.id !== id))
}
