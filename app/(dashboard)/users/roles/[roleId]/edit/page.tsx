import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { RoleForm } from "@/components/users/role-form"

export const metadata: Metadata = {
  title: "Update User Role · SMS Admin",
}

export default async function Page({ params }: PageProps<"/users/roles/[roleId]/edit">) {
  const { roleId } = await params
  return (
    <RequirePlatform>
      <RoleForm roleId={Number(roleId)} />
    </RequirePlatform>
  )
}
