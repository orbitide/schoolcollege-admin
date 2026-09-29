"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { RecordStatus } from "@/lib/institutes"

// Admin users and the institutes they may work with (legacy User
// Institute). Districts live in lib/districts.ts. In-memory dummy stores like
// the rest of admin; replace with API calls once the backend endpoints exist.

// The built-in roles. Roles are managed in lib/user-roles.ts (Manage User
// Roles); pick from useUserRoleNames() there, which includes custom ones.
export const userRoles = [
  "Super Admin",
  "Institute Admin",
  "Institute Manager",
  "Institute Viewer",
  "Teacher",
] as const
// A role's name (lib/user-roles.ts).
export type UserRole = string

export const userGenders = ["Male", "Female", "Unknown"] as const
export type UserGender = (typeof userGenders)[number]

// Legacy NccUser as Users/CreateEdit edits it; `name` is its Full Name.
export type AdminUser = {
  id: number
  // Sign-in name: unique, and fixed once the user exists.
  userName: string
  name: string
  email: string
  emailConfirmed: boolean
  // A super admin works with every institute; everyone else only with the
  // institutes linked to them in User Institutes. What they may do there
  // (Admin / Manage / View) comes from the role, see lib/access.ts.
  role: UserRole
  mobile: string
  mobileConfirmed: boolean
  gender: UserGender
  // yyyy-mm-dd
  dateOfBirth: string
  // A data URL, or "" for none (legacy ProfilePicture, set on User Profile).
  profilePicture: string
  // Asked to set a new password at next sign-in.
  forcePasswordChange: boolean
  twoFactorEnabled: boolean
  // A blocked user can't sign in; their links and history stay.
  status: UserStatus
  // Legacy IsRequireLogin: the session is ended and the user must sign in
  // again (force logout, password reset, block). Signing in clears it.
  requireLogin: boolean
  // Legacy Extra Permission: permission codes (lib/access.ts) allowed or
  // denied to this user on top of their role. A code is in at most one list.
  extraAllow: string[]
  extraDeny: string[]
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export const userStatuses = ["Active", "Blocked"] as const
export type UserStatus = (typeof userStatuses)[number]

export type AdminUserInput = Pick<
  AdminUser,
  | "userName"
  | "name"
  | "email"
  | "emailConfirmed"
  | "mobile"
  | "mobileConfirmed"
  | "role"
  | "gender"
  | "dateOfBirth"
  | "forcePasswordChange"
  | "twoFactorEnabled"
> & {
  // Left blank on update, the password stays as it is.
  password: string
  confirmPassword: string
}

const userSeedStamp = {
  emailConfirmed: true,
  mobileConfirmed: false,
  gender: "Unknown" as const,
  dateOfBirth: "1990-01-01",
  profilePicture: "",
  forcePasswordChange: false,
  twoFactorEnabled: false,
  requireLogin: false,
  extraAllow: [] as string[],
  extraDeny: [] as string[],
  status: "Active" as const,
  createdBy: "Super Admin",
  createdAt: "2026-01-05T09:00:00.000Z",
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-05T09:00:00.000Z",
}

// Admin-panel users (every role) until the users API exists.
const seedAdminUsers: AdminUser[] = [
  { id: 1, userName: "superadmin", name: "Super Admin", email: "admin@sms.app", mobile: "01711000001", role: "Super Admin", ...userSeedStamp },
  { id: 2, userName: "rafiq", name: "Rafiq Hasan", email: "rafiq@sms.app", mobile: "01711000002", role: "Institute Admin", ...userSeedStamp },
  { id: 3, userName: "nusrat", name: "Nusrat Jahan", email: "nusrat@sms.app", mobile: "01711000003", role: "Institute Admin", ...userSeedStamp },
  { id: 4, userName: "tanvir", name: "Tanvir Ahmed", email: "tanvir@sms.app", mobile: "01711000004", role: "Institute Admin", ...userSeedStamp },
  { id: 5, userName: "farhana", name: "Farhana Akter", email: "farhana@sms.app", mobile: "01711000005", role: "Institute Manager", ...userSeedStamp },
  { id: 6, userName: "imran", name: "Imran Hossain", email: "imran@sms.app", mobile: "01711000006", role: "Institute Viewer", ...userSeedStamp },
  // Signs in as teacher 1 (Teacher.userId).
  { id: 7, userName: "abdul.karim", name: "Abdul Karim", email: "abdul@school.edu.bd", mobile: "01711000007", role: "Teacher", ...userSeedStamp },
]

let adminUsers = seedAdminUsers
const userListeners = new Set<() => void>()

function emitUsers(next: AdminUser[]) {
  logChanges("AdminUser", adminUsers, next, (u) => u.userName)
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

// Passwords set on Users/CreateEdit, by user id; everyone else signs in with
// the shared DEMO_PASSWORD (lib/current-user.ts). Kept off the user rows so
// Common Log never records them. Dummy only: the API will keep a hash.
const passwords = new Map<number, string>()

export function passwordOf(userId: number): string | undefined {
  return passwords.get(userId)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USER_MOBILE_PATTERN = /^(88)?01[3-9]\d{8}$/
// ASP.NET Identity's default AllowedUserNameCharacters.
const USER_NAME_PATTERN = /^[A-Za-z0-9\-._@+]+$/

// Identity's production password rules: 6+ characters with a digit.
export function passwordError(password: string) {
  if (password.length < 6) return "Passwords must be at least 6 characters."
  if (!/\d/.test(password)) return "Passwords must have at least one digit ('0'-'9')."
  return undefined
}

// Legacy CreateEdit's checks: user name, full name and email required, the
// password (required for a new user) confirmed and meeting Identity's
// production rules (6+ characters with a digit).
export function adminUserErrors(input: AdminUserInput, exceptId?: number) {
  const errors: Partial<Record<keyof AdminUserInput, string>> = {}
  const userName = input.userName.trim()
  if (exceptId == null) {
    if (!userName) errors.userName = "User name is required."
    else if (!USER_NAME_PATTERN.test(userName))
      errors.userName = `User name '${userName}' is invalid, can only contain letters or digits.`
    else if (adminUsers.some((u) => u.userName.toLowerCase() === userName.toLowerCase()))
      errors.userName = `User name '${userName}' is already taken.`
  }
  if (!input.name.trim()) errors.name = "Full name is required."
  const email = input.email.trim().toLowerCase()
  if (!email) errors.email = "The Email field is required"
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address."
  else if (adminUsers.some((u) => u.id !== exceptId && u.email.toLowerCase() === email))
    errors.email = `Email '${email}' is already taken.`
  if (input.mobile.trim() && !USER_MOBILE_PATTERN.test(input.mobile.trim()))
    errors.mobile = "Enter a mobile number like 01XXXXXXXXX."
  if (!input.dateOfBirth) errors.dateOfBirth = "Date of birth is required."
  if (exceptId == null && !input.password) errors.password = "Password is required."
  else if (input.password) {
    const error = passwordError(input.password)
    if (error) errors.password = error
  }
  if ((input.password || input.confirmPassword) && input.password !== input.confirmPassword)
    errors.confirmPassword = "Password does not match."
  return errors
}

// The fields both save paths write. A confirmed flag only sticks when there
// is an email / mobile to confirm, as legacy does.
function userFields(input: AdminUserInput) {
  const email = input.email.trim().toLowerCase()
  const mobile = input.mobile.trim()
  return {
    name: input.name.trim(),
    email,
    emailConfirmed: !!email && input.emailConfirmed,
    mobile,
    mobileConfirmed: !!mobile && input.mobileConfirmed,
    role: input.role,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    forcePasswordChange: input.forcePasswordChange,
    twoFactorEnabled: input.twoFactorEnabled,
  }
}

export function addAdminUser(input: AdminUserInput, by: string) {
  const now = new Date().toISOString()
  const user: AdminUser = {
    id: Math.max(0, ...adminUsers.map((u) => u.id)) + 1,
    userName: input.userName.trim(),
    ...userFields(input),
    profilePicture: "",
    status: "Active",
    requireLogin: false,
    extraAllow: [],
    extraDeny: [],
    createdBy: by,
    createdAt: now,
    modifiedBy: by,
    modifiedAt: now,
  }
  passwords.set(user.id, input.password)
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

// The user name never changes; a blank password keeps the current one. Like
// legacy, the user must sign in again to pick up the changes, except when
// `requireLogin` is false (someone editing their own account).
export function updateAdminUser(id: number, input: AdminUserInput, by: string, requireLogin = true) {
  if (input.password) passwords.set(id, input.password)
  if (requireLogin) setUserOnline(id, false)
  patchUser(id, requireLogin ? { ...userFields(input), requireLogin: true } : userFields(input), by)
}

// Blocking also ends the session; unblocking lets them straight back in
// (legacy BlockUnBlockUsers).
export function setAdminUserStatus(id: number, status: UserStatus, by: string) {
  if (status === "Blocked") setUserOnline(id, false)
  patchUser(id, { status, requireLogin: status === "Blocked" }, by)
}

// Ends the user's session so they must sign in again (legacy ForceLgout and
// LogOutAll).
export function requireAdminUserLogin(id: number, by: string) {
  setUserOnline(id, false)
  patchUser(id, { requireLogin: true }, by)
}

// ---- The signed-in user's own account (legacy Manage/IndexBackend) ----

export type ProfileInput = Pick<AdminUser, "name" | "gender" | "dateOfBirth" | "email" | "mobile" | "profilePicture">

export function profileErrors(input: ProfileInput, id: number) {
  const errors: Partial<Record<keyof ProfileInput, string>> = {}
  if (!input.name.trim()) errors.name = "Full name is required."
  const email = input.email.trim().toLowerCase()
  if (!email) errors.email = "The Email field is required"
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address."
  else if (adminUsers.some((u) => u.id !== id && u.email.toLowerCase() === email))
    errors.email = `Email '${email}' is already taken.`
  if (input.mobile.trim() && !USER_MOBILE_PATTERN.test(input.mobile.trim()))
    errors.mobile = "Enter a mobile number like 01XXXXXXXXX."
  if (!input.dateOfBirth) errors.dateOfBirth = "Date of birth is required."
  return errors
}

// The user stays signed in. As with Identity's SetEmail / SetPhoneNumber, a
// changed email or mobile is no longer confirmed.
export function updateOwnProfile(id: number, input: ProfileInput, by: string) {
  const user = adminUsers.find((u) => u.id === id)
  if (!user) return
  const email = input.email.trim().toLowerCase()
  const mobile = input.mobile.trim()
  patchUser(
    id,
    {
      name: input.name.trim(),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      profilePicture: input.profilePicture,
      email,
      emailConfirmed: user.emailConfirmed && email === user.email,
      mobile,
      mobileConfirmed: user.mobileConfirmed && !!mobile && mobile === user.mobile,
    },
    by
  )
}

// Legacy ChangePasswordBackend, once lib/current-user.ts has checked the
// current password: the user stays signed in, and a pending Force Password
// Change is done.
export function setOwnPassword(id: number, password: string, by: string) {
  passwords.set(id, password)
  patchUser(id, { forcePasswordChange: false }, by)
}

// Legacy Disable2fa.
export function disableOwnTwoFactor(id: number, by: string) {
  patchUser(id, { twoFactorEnabled: false }, by)
}

// Legacy ResetPasswords: a new 6-character password, and the user signs in
// again with it. Returns the password (legacy emails it to the user).
export function resetAdminUserPassword(id: number, by: string) {
  const letters = "abcdefghjkmnpqrstuvwxyz"
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]
  // Meets the CreateEdit rule of at least one digit.
  const password = [pick(letters), pick(letters), pick(letters), pick("23456789"), pick("23456789"), pick(letters)].join("")
  passwords.set(id, password)
  requireAdminUserLogin(id, by)
  return password
}

export function setAdminUserRole(id: number, role: UserRole, by: string) {
  patchUser(id, { role }, by)
}

// Moves every user of role `from` to role `to` (a role renamed or deleted
// in Manage User Roles).
export function reassignUsersRole(from: UserRole, to: UserRole, by: string) {
  if (from === to || !adminUsers.some((u) => u.role === from)) return
  const now = new Date().toISOString()
  emitUsers(adminUsers.map((u) => (u.role === from ? { ...u, role: to, modifiedBy: by, modifiedAt: now } : u)))
}

// Legacy ExtraPermissionOperation / ExtraDenyOperation: allowing a code
// drops it from the denies and vice versa. It takes hold at once, as legacy
// drops the user from its permission cache.
export function saveUserExtraPermissions(id: number, allow: string[], deny: string[], by: string) {
  const denied = new Set(deny)
  const extraAllow = [...new Set(allow)].filter((code) => !denied.has(code)).sort()
  const extraDeny = [...denied].sort()
  patchUser(id, { extraAllow, extraDeny }, by)
}

// Who has a live session (legacy GlobalCache NccUser.IsOnline). Kept off the
// user rows so signing in and out stays out of the Common Log. Two seed users
// stand in for sessions on other devices.
const seedOnlineUserIds: ReadonlySet<number> = new Set([2, 5])
let onlineUserIds = seedOnlineUserIds
const onlineListeners = new Set<() => void>()

export function setUserOnline(id: number, online: boolean) {
  if (onlineUserIds.has(id) === online) return
  const next = new Set(onlineUserIds)
  if (online) next.add(id)
  else next.delete(id)
  onlineUserIds = next
  onlineListeners.forEach((listener) => listener())
}

function subscribeOnline(listener: () => void) {
  onlineListeners.add(listener)
  return () => onlineListeners.delete(listener)
}

export function useOnlineUserIds() {
  return React.useSyncExternalStore(subscribeOnline, () => onlineUserIds, () => seedOnlineUserIds)
}

// Signing in starts a session and clears Require Login, as the legacy login
// does. Not stamped as a modification, like legacy.
export function markSignedIn(id: number) {
  setUserOnline(id, true)
  if (adminUsers.some((u) => u.id === id && u.requireLogin))
    emitUsers(adminUsers.map((u) => (u.id === id ? { ...u, requireLogin: false } : u)))
}

// Legacy GetUserStatus: Blocked, then Require Login, then Online / Offline.
export type UserSessionStatus = "Online" | "Offline" | "Blocked" | "Require Login"

export function userSessionStatus(user: AdminUser, online: ReadonlySet<number>): UserSessionStatus {
  if (user.status === "Blocked") return "Blocked"
  if (user.requireLogin) return "Require Login"
  return online.has(user.id) ? "Online" : "Offline"
}

// Deletes the user and their institute links.
export function removeAdminUser(id: number) {
  setUserOnline(id, false)
  passwords.delete(id)
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
