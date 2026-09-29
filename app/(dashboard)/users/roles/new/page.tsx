import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { RoleForm } from "@/components/users/role-form"

export const metadata: Metadata = {
  title: "New User Role · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <RoleForm />
    </RequirePlatform>
  )
}
