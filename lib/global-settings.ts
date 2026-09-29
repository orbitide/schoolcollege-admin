"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { RecordStatus } from "@/lib/institutes"

// Admin users and the institutes they may work with (legacy User
// Institute). Districts live in lib/districts.ts. In-memory dummy stores like
// the rest of admin; replace with API calls once the backend endpoints exist.

export const userRoles = [
  "Super Admin",
  "Institute Admin",
  "Institute Manager",
  "Institute Viewer",
  "Teacher",
] as const
export type UserRole = (typeof userRoles)[number]

export type AdminUser = {
  id: number
  name: string
  email: string
  // A super admin works with every institute; everyone else only with the
  // institutes linked to them in User Institutes. What they may do there
  // (Admin / Manage / View) comes from the role, see lib/access.ts.
  role: UserRole
  mobile: string
  // A blocked user can't sign in; their links and history stay.
  status: UserStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export const userStatuses = ["Active", "Blocked"] as const
export type UserStatus = (typeof userStatuses)[number]

export type AdminUserInput = Pick<AdminUser, "name" | "email" | "mobile" | "role">

const userSeedStamp = {
  status: "Active" as const,
  createdBy: "Super Admin",
  createdAt: "2026-01-05T09:00:00.000Z",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-05T09:00:00.000Z",
}

// Admin-panel users (every role) until the users API exists.
const seedAdminUsers: AdminUser[] = [
  { id: 1, name: "Super Admin", email: "admin@sms.app", mobile: "01711000001", role: "Super Admin", ...userSeedStamp },
  { id: 2, name: "Rafiq Hasan", email: "rafiq@sms.app", mobile: "01711000002", role: "Institute Admin", ...userSeedStamp },
  { id: 3, name: "Nusrat Jahan", email: "nusrat@sms.app", mobile: "01711000003", role: "Institute Admin", ...userSeedStamp },
  { id: 4, name: "Tanvir Ahmed", email: "tanvir@sms.app", mobile: "01711000004", role: "Institute Admin", ...userSeedStamp },
  { id: 5, name: "Farhana Akter", email: "farhana@sms.app", mobile: "01711000005", role: "Institute Manager", ...userSeedStamp },
  { id: 6, name: "Imran Hossain", email: "imran@sms.app", mobile: "01711000006", role: "Institute Viewer", ...userSeedStamp },
  // Signs in as teacher 1 (Teacher.userId).
  { id: 7, name: "Abdul Karim", email: "abdul@school.edu.bd", mobile: "01711000007", role: "Teacher", ...userSeedStamp },
]

let adminUsers = seedAdminUsers
const userListeners = new Set<() => void>()

function emitUsers(next: AdminUser[]) {
  logChanges("AdminUser", adminUsers, next, (u) => u.email)
  adminUsers = next
  userListeners.forEach((listener) => listener())
}

function subscribeUsers(listener: () => void) {
  userListeners.add(listener)
  return () => userListeners.delete(listener)
}

export function getAdminUsers() {
  return adminUsers
}

export function useAdminUsers() {
  return React.useSyncExternalStore(subscribeUsers, () => adminUsers, () => seedAdminUsers)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USER_MOBILE_PATTERN = /^(88)?01[3-9]\d{8}$/

export function adminUserErrors(input: AdminUserInput, exceptId?: number) {
  const errors: Partial<Record<keyof AdminUserInput, string>> = {}
  if (!input.name.trim()) errors.name = "Enter the user's name."
  const email = input.email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address."
  else if (adminUsers.some((u) => u.id !== exceptId && u.email.toLowerCase() === email))
    errors.email = "Another user already has this email."
  if (input.mobile.trim() && !USER_MOBILE_PATTERN.test(input.mobile.trim()))
    errors.mobile = "Enter a mobile number like 01XXXXXXXXX."
  return errors
}

export function addAdminUser(input: AdminUserInput, by: string) {
  const now = new Date().toISOString()
  const user: AdminUser = {
    id: Math.max(0, ...adminUsers.map((u) => u.id)) + 1,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile.trim(),
    role: input.role,
    status: "Active",
    createdBy: by,
    createdAt: now,
    modifiedBy: by,
    modifiedAt: now,
  }
  emitUsers([...adminUsers, user])
  return user
}

function patchUser(id: number, changes: Partial<AdminUser>, by: string) {
  emitUsers(
    adminUsers.map((u) =>
      u.id === id ? { ...u, ...changes, modifiedBy: by, modifiedAt: new Date().toISOString() } : u
    )
  )
}

export function updateAdminUser(id: number, input: AdminUserInput, by: string) {
  patchUser(
    id,
    { name: input.name.trim(), email: input.email.trim().toLowerCase(), mobile: input.mobile.trim(), role: input.role },
    by
  )
}

export function setAdminUserStatus(id: number, status: UserStatus, by: string) {
  patchUser(id, { status }, by)
}

// Deletes the user and their institute links.
export function removeAdminUser(id: number) {
  emitUsers(adminUsers.filter((u) => u.id !== id))
  if (userInstitutes.some((u) => u.userId === id)) emit(userInstitutes.filter((u) => u.userId !== id))
}

// Which institutes a user can work with (legacy UserInstitute).
export type UserInstitute = {
  id: number
  userId: number
  instituteId: number
  status: RecordStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const seedStamp = {
  createdBy: "Super Admin",
  createdAt: "2026-01-10T09:30:00.000Z",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-10T09:30:00.000Z",
}

let userInstitutes: UserInstitute[] = [
  { id: 1, userId: 2, instituteId: 1, status: "Active", ...seedStamp },
  { id: 2, userId: 2, instituteId: 2, status: "Active", ...seedStamp },
  { id: 3, userId: 3, instituteId: 3, status: "Active", ...seedStamp },
  { id: 4, userId: 5, instituteId: 1, status: "Active", ...seedStamp },
  { id: 5, userId: 6, instituteId: 1, status: "Active", ...seedStamp },
  { id: 6, userId: 7, instituteId: 1, status: "Active", ...seedStamp },
]
const seedUserInstitutes = userInstitutes
const listeners = new Set<() => void>()

function emit(next: UserInstitute[]) {
  logChanges("UserInstitute", userInstitutes, next)
  userInstitutes = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUserInstitutes() {
  return React.useSyncExternalStore(
    subscribe,
    () => userInstitutes,
    () => seedUserInstitutes
  )
}

// Swaps the links `keep` rejects for fresh Active ones, as legacy
// UserInstituteService.Save deletes the old rows and adds the ticked ones.
function replaceLinks(
  keep: (link: UserInstitute) => boolean,
  pairs: { userId: number; instituteId: number }[],
  by: string
) {
  const stamp = new Date().toISOString()
  let nextId = Math.max(0, ...userInstitutes.map((u) => u.id))
  emit([
    ...userInstitutes.filter(keep),
    ...pairs.map((pair) => ({
      ...pair,
      id: ++nextId,
      status: "Active" as const,
      createdBy: by,
      createdAt: stamp,
      modifiedBy: by,
      modifiedAt: stamp,
    })),
  ])
}

// Legacy "Add User Wise Institute": the user's institutes become exactly
// `instituteIds`. Only institutes in `scope` (those the saver may work with)
// are replaced; the user's links to other institutes stay.
export function saveUserInstitutes(
  userId: number,
  instituteIds: number[],
  scope: number[],
  by: string
) {
  const inScope = new Set(scope)
  replaceLinks(
    (u) => u.userId !== userId || !inScope.has(u.instituteId),
    instituteIds.map((instituteId) => ({ userId, instituteId })),
    by
  )
}

// Legacy "Add Institute Wise User": the institute's users become exactly
// `userIds`.
export function saveInstituteUsers(instituteId: number, userIds: number[], by: string) {
  replaceLinks(
    (u) => u.instituteId !== instituteId,
    userIds.map((userId) => ({ userId, instituteId })),
    by
  )
}

// Active ⇄ Inactive.
export function toggleUserInstituteStatus(id: number, by: string) {
  emit(
    userInstitutes.map((u) =>
      u.id === id
        ? {
            ...u,
            status: u.status === "Active" ? "Inactive" : "Active",
            modifiedBy: by,
            modifiedAt: new Date().toISOString(),
          }
        : u
    )
  )
}

export function removeUserInstitute(id: number) {
  emit(userInstitutes.filter((u) => u.id !== id))
}

export function removeInstituteUsers(instituteId: number) {
  emit(userInstitutes.filter((u) => u.instituteId !== instituteId))
}
