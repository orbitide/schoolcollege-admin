"use client"

import * as React from "react"

import {
  getAdminUsers,
  markSignedIn,
  setOwnPassword,
  setUserOnline,
  useAdminUsers,
  useUserInstitutes,
  type AdminUser,
} from "@/lib/global-settings"
import { ApiError, httpClient, onUnauthorized } from "@/lib/http-client"
import { useInstitutes } from "@/lib/institutes-store"
import { useTeachers } from "@/lib/teachers"

// ---- Session ----
// Who is using the admin panel. The session is the API's httpOnly cookie
// (SchoolCollege AuthController); this module only remembers whose it is.
// The users themselves are still the in-memory list in lib/global-settings,
// whose seed ids and emails match the API's development seed.

// The API's development seed password (DevelopmentSeeder).
export const DEMO_PASSWORD = "123456"

const sessionListeners = new Set<() => void>()
// undefined: not asked the API yet (or still asking); null: signed out.
let sessionUserId: number | null | undefined
let sessionRequest: Promise<void> | undefined

function setSession(userId: number | null) {
  sessionUserId = userId
  sessionListeners.forEach((listener) => listener())
}

// Asks the API once per page load whose cookie this browser holds.
function loadSession() {
  sessionRequest ??= httpClient
    .get<AdminUser | null>("/auth/session")
    .then((user) => setSession(user?.id ?? null))
    .catch(() => setSession(null))
}

function subscribeSession(listener: () => void) {
  loadSession()
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

// A 401 from any call means the session ended (expired, blocked, forced out).
onUnauthorized(() => {
  if (sessionUserId != null) setSession(null)
})

// The signed-in user's id; null when signed out, undefined while the API
// hasn't answered yet (and on the server).
export function useSessionUserId() {
  return React.useSyncExternalStore(subscribeSession, () => sessionUserId, () => undefined)
}

// Signs in by email (or user name) and password. Throws an ApiError with
// the message to show when that isn't possible.
export async function signIn(email: string, password: string) {
  const user = await httpClient.post<AdminUser>("/auth/login", { login: email.trim(), password })
  markSignedIn(user.id)
  setSession(user.id)
  return user
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

export function signOut() {
  if (sessionUserId != null) setUserOnline(sessionUserId, false)
  setSession(null)
  // Ends the cookie; failing here (server down) still leaves this tab signed out.
  httpClient.post("/auth/logout").catch(() => {})
}

// The SaaS owner's staff, who work across every institute (platform
// dashboard, plans, subscriptions); everyone else works inside institutes.
export function isPlatformAdmin(user: Pick<AdminUser, "role">) {
  return user.role === "Super Admin"
}

// The signed-in user. Pages sit behind RequireLogin, so there always is
// one there; the first user stands in only while it redirects.
export function useCurrentUser() {
  const users = useAdminUsers()
  const userId = useSessionUserId()
  return users.find((user) => user.id === userId) ?? users[0]
}

// The same user outside React, for stores that stamp what they write.
export function getCurrentUser() {
  const users = getAdminUsers()
  const userId = typeof window === "undefined" ? null : sessionUserId
  return users.find((user) => user.id === userId) ?? users[0]
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
