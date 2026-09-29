import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { RolePermissions } from "@/components/users/role-permissions"

export const metadata: Metadata = {
  title: "Role Permissions · SMS Admin",
}

export default async function Page({ params }: PageProps<"/users/roles/[roleId]/permissions">) {
  const { roleId } = await params
  return (
    <RequirePlatform>
      <RolePermissions roleId={Number(roleId)} />
    </RequirePlatform>
  )
}
