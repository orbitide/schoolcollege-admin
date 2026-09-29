import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { RoleList } from "@/components/users/role-list"

export const metadata: Metadata = {
  title: "Manage User Roles · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <RoleList />
    </RequirePlatform>
  )
}
