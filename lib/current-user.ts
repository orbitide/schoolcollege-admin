"use client"

import * as React from "react"

import { adminUsers, useUserInstitutes, type AdminUser } from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"
import { useTeachers } from "@/lib/teachers"

// Who is using the admin panel. There is no login yet, so this is the super
// admin; replace it with the signed-in user once authentication exists.
// (Set it to 3 to try the panel as an institute admin of one institute, 5 as
// an institute manager, 6 as an institute viewer, 7 as a teacher.)
const currentUserId = 1

// The SaaS owner's staff, who work across every institute (platform
// dashboard, plans, subscriptions); everyone else works inside institutes.
export function isPlatformAdmin(user: Pick<AdminUser, "role">) {
  return user.role === "Super Admin"
}

export function useCurrentUser() {
  return getCurrentUser()
}

// The same user outside React, for stores that stamp what they write.
export function getCurrentUser() {
  return adminUsers.find((user) => user.id === currentUserId) ?? adminUsers[0]
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
