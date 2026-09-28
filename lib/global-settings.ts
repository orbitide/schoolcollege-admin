"use client"

import * as React from "react"

import { createRecordStore } from "@/lib/academic-store"
import type { AcademicRecord, RecordStatus } from "@/lib/institutes"

// Settings shared by every institute (legacy District, User Institute).
// In-memory dummy stores like the rest of admin; replace with API calls once
// the backend endpoints exist.

// Global records reuse the ranked record store under this institute id.
export const GLOBAL = 0

export type District = AcademicRecord & { nameBn: string }

export const districtStore = createRecordStore<District>(
  [
    ["Dhaka", "ঢাকা"],
    ["Chattogram", "চট্টগ্রাম"],
    ["Rajshahi", "রাজশাহী"],
    ["Khulna", "খুলনা"],
    ["Barishal", "বরিশাল"],
    ["Sylhet", "সিলেট"],
    ["Rangpur", "রংপুর"],
    ["Mymensingh", "ময়মনসিংহ"],
  ].map(([name, nameBn], index) => ({
    id: index + 1,
    instituteId: GLOBAL,
    name,
    nameBn,
    rank: index + 1,
    status: "Active" as const,
  }))
)

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
}

// Admin users until the users module and its API exist.
export const adminUsers: AdminUser[] = [
  { id: 1, name: "Super Admin", email: "admin@sms.app", role: "Super Admin" },
  { id: 2, name: "Rafiq Hasan", email: "rafiq@sms.app", role: "Institute Admin" },
  { id: 3, name: "Nusrat Jahan", email: "nusrat@sms.app", role: "Institute Admin" },
  { id: 4, name: "Tanvir Ahmed", email: "tanvir@sms.app", role: "Institute Admin" },
  { id: 5, name: "Farhana Akter", email: "farhana@sms.app", role: "Institute Manager" },
  { id: 6, name: "Imran Hossain", email: "imran@sms.app", role: "Institute Viewer" },
  // Signs in as teacher 1 (Teacher.userId).
  { id: 7, name: "Abdul Karim", email: "abdul@school.edu.bd", role: "Teacher" },
]

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
