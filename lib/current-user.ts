"use client"

import * as React from "react"

import { adminUsers, useUserInstitutes } from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"

// Who is using the admin panel. There is no login yet, so this is the super
// admin; replace it with the signed-in user once authentication exists.
// (Set it to 3 to try the panel as an institute admin of one institute.)
const currentUserId = 1

export function useCurrentUser() {
  return adminUsers.find((user) => user.id === currentUserId) ?? adminUsers[0]
}

// The institutes the current user may work with (legacy
// InstituteService.LoadAll(userId)): all of them for a super admin, else
// those linked to the user in User Institutes.
export function useAccessibleInstitutes() {
  const user = useCurrentUser()
  const institutes = useInstitutes()
  const links = useUserInstitutes()
  return React.useMemo(() => {
    if (user.role === "Super Admin") return institutes
    const allowed = new Set(
      links
        .filter((link) => link.userId === user.id && link.status === "Active")
        .map((link) => link.instituteId)
    )
    return institutes.filter((institute) => allowed.has(institute.id))
  }, [user, institutes, links])
}
