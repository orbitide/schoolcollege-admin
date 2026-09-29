"use client"

import * as React from "react"

import {
  getAdminUsers,
  markSignedIn,
  passwordOf,
  setUserOnline,
  useAdminUsers,
  useUserInstitutes,
  type AdminUser,
} from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"
import { useTeachers } from "@/lib/teachers"

// ---- Dummy session ----
// Who is using the admin panel: the user signed in on the login page, kept
// in localStorage so a refresh stays signed in. Every active user signs in with
// DEMO_PASSWORD unless Users/CreateEdit set their own. Replace with the auth
// API once the backend exists.

export const DEMO_PASSWORD = "123456"

const SESSION_KEY = "sms-admin-session"
const sessionListeners = new Set<() => void>()
// undefined: not read from localStorage yet; null: signed out.
let sessionUserId: number | null | undefined

function readSession() {
  if (sessionUserId === undefined) {
    try {
      const stored = Number(localStorage.getItem(SESSION_KEY))
      sessionUserId = stored > 0 ? stored : null
    } catch {
      sessionUserId = null
    }
  }
  return sessionUserId
}

function setSession(userId: number | null) {
  sessionUserId = userId
  try {
    if (userId == null) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, String(userId))
  } catch {
    // Storage blocked (private window): the session lasts until a refresh.
  }
  sessionListeners.forEach((listener) => listener())
}

function subscribeSession(listener: () => void) {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

// The signed-in user's id, or null. On the server nobody is signed in.
export function useSessionUserId() {
  return React.useSyncExternalStore(subscribeSession, readSession, () => null)
}

// Signs in an active user by email and their password. Throws with the
// message to show when that isn't possible.
export function signIn(email: string, password: string) {
  const user = getAdminUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  )
  if (!user || password !== (passwordOf(user.id) ?? DEMO_PASSWORD)) throw new Error("Invalid email or password.")
  if (user.status !== "Active") throw new Error("This user is blocked and can't sign in.")
  markSignedIn(user.id)
  setSession(user.id)
  return user
}

export function signOut() {
  const userId = readSession()
  if (userId != null) setUserOnline(userId, false)
  setSession(null)
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
  const userId = typeof window === "undefined" ? null : readSession()
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
