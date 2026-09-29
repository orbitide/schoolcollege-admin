"use client"

import * as React from "react"

import {
  markSignedIn,
  setOwnPassword,
  useUserInstitutes,
  type AdminUser,
} from "@/lib/global-settings"
import { ApiError, httpClient } from "@/lib/http-client"
import { useInstitutes } from "@/lib/institutes-store"
import { useTeachers } from "@/lib/teachers"

// ---- Signed-in user ----
// Whether someone is signed in is decided by the backend alone, through its
// httpOnly session cookie (SchoolCollege AuthController). The frontend never
// reads or stores it: it asks GET /auth/me, and the user data coming back is
// what "signed in" means here. The user lives in React memory (RequireLogin's
// context) and is fetched again on every page load.

// The seed migration's demo password (SeedDemoUsers).
export const DEMO_PASSWORD = "123456"

// What login and /auth/me return about the signed-in user (CurrentUser in
// Framework/Identity/AuthContracts.cs).
export type CurrentUser = Pick<
  AdminUser,
  "id" | "userName" | "name" | "email" | "role" | "profilePicture" | "forcePasswordChange" | "extraAllow" | "extraDeny"
> & {
  // The role's permission codes and patterns ("*", "*.view"), for grants().
  permissions: string[]
}

// The user the session cookie belongs to, or null when there's no valid
// session (the API answers 401).
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await httpClient.get<CurrentUser>("/auth/me")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

// Signs in by email (or user name) and password; the API sets its cookie and
// returns the user. Throws an ApiError with the message to show otherwise.
export async function signIn(email: string, password: string) {
  const user = await httpClient.post<CurrentUser>("/auth/login", { login: email.trim(), password })
  markSignedIn(user.id)
  return user
}

// Provided by RequireLogin once /auth/me has answered with a user.
export const CurrentUserContext = React.createContext<CurrentUser | null>(null)

// The same user for code outside React (stores stamping who wrote a row).
// A mirror of the context value, set by RequireLogin; never a login flag.
let stampUser: Pick<CurrentUser, "id" | "name"> | null = null

export function setStampUser(user: Pick<CurrentUser, "id" | "name"> | null) {
  stampUser = user
}

type PasswordChange = { oldPassword: string; newPassword: string; confirmPassword: string }

// Legacy ChangePasswordBackend for the signed-in user. Resolves to the
// errors to show per field; none means the password was changed. Anything
// else (server down) rejects with an ApiError.
export async function changeOwnPassword(input: PasswordChange): Promise<Partial<Record<keyof PasswordChange, string>>> {
  try {
    await httpClient.post("/auth/change-password", input)
  } catch (error) {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length) return error.fieldErrors
    throw error
  }
  // Keep the in-memory row (Force Password Change, demo sign-in) in step.
  const user = getCurrentUser()
  setOwnPassword(user.id, input.newPassword, user.name)
  return {}
}

// The API ends the session (clears its cookie); a full page load to the login
// page then drops everything this tab held in memory.
export async function signOut() {
  try {
    await httpClient.post("/auth/logout")
  } finally {
    // A full load on purpose (not router.push): nothing the previous user
    // loaded may survive in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login")
  }
}

// The SaaS owner's staff, who work across every institute (platform
// dashboard, plans, subscriptions); everyone else works inside institutes.
export function isPlatformAdmin(user: Pick<AdminUser, "role">) {
  return user.role === "Super Admin"
}

// The signed-in user. Pages sit behind RequireLogin, which only renders them
// once /auth/me has returned the user.
export function useCurrentUser(): CurrentUser {
  const user = React.useContext(CurrentUserContext)
  if (!user) throw new Error("useCurrentUser() must be used inside <RequireLogin>.")
  return user
}

// The same user outside React, for stores that stamp what they write.
export function getCurrentUser(): Pick<CurrentUser, "id" | "name"> {
  return stampUser ?? { id: 0, name: "System" }
}

// The teacher the current user signs in as (legacy
// TeacherService.GetTeacherByNccUserId), if one is linked.
export function useCurrentTeacher() {
  const user = useCurrentUser()
  const teachers = useTeachers()
  return teachers.find((t) => t.userId === user.id && t.status !== "Deleted")
}

// The institutes the current user may work with (legacy
// InstituteService.LoadAll(userId)): all of them for a super admin, else
// those linked to the user in User Institutes.
export function useAccessibleInstitutes() {
  const user = useCurrentUser()
  const institutes = useInstitutes()
  const links = useUserInstitutes()
  return React.useMemo(() => {
    if (isPlatformAdmin(user)) return institutes
    const allowed = new Set(
      links
        .filter((link) => link.userId === user.id && link.status === "Active")
        .map((link) => link.instituteId)
    )
    return institutes.filter((institute) => allowed.has(institute.id))
  }, [user, institutes, links])
}
