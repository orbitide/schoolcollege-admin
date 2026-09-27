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

export const userRoles = ["Super Admin", "Institute Admin"] as const
export type UserRole = (typeof userRoles)[number]

export type AdminUser = {
  id: number
  name: string
  email: string
  // A super admin works with every institute; an institute admin only with
  // the institutes linked to them in User Institutes.
  role: UserRole
}

// Admin users until the users module and its API exist.
export const adminUsers: AdminUser[] = [
  { id: 1, name: "Super Admin", email: "admin@sms.app", role: "Super Admin" },
  { id: 2, name: "Rafiq Hasan", email: "rafiq@sms.app", role: "Institute Admin" },
  { id: 3, name: "Nusrat Jahan", email: "nusrat@sms.app", role: "Institute Admin" },
  { id: 4, name: "Tanvir Ahmed", email: "tanvir@sms.app", role: "Institute Admin" },
]

// Which institutes a user can work with (legacy UserInstitute).
export type UserInstitute = {
  id: number
  userId: number
  instituteId: number
  status: RecordStatus
}

let userInstitutes: UserInstitute[] = [
  { id: 1, userId: 2, instituteId: 1, status: "Active" },
  { id: 2, userId: 2, instituteId: 2, status: "Active" },
  { id: 3, userId: 3, instituteId: 3, status: "Active" },
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

// Returns false when the user is already linked to the institute.
export function assignUserInstitute(userId: number, instituteId: number) {
  if (userInstitutes.some((u) => u.userId === userId && u.instituteId === instituteId)) {
    return false
  }
  emit([
    ...userInstitutes,
    {
      id: Math.max(0, ...userInstitutes.map((u) => u.id)) + 1,
      userId,
      instituteId,
      status: "Active",
    },
  ])
  return true
}

export function setUserInstituteStatus(id: number, status: RecordStatus) {
  emit(userInstitutes.map((u) => (u.id === id ? { ...u, status } : u)))
}

export function removeUserInstitute(id: number) {
  emit(userInstitutes.filter((u) => u.id !== id))
}

export function removeInstituteUsers(instituteId: number) {
  emit(userInstitutes.filter((u) => u.instituteId !== instituteId))
}
