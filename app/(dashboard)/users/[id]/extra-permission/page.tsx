import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { UserExtraPermission } from "@/components/users/user-extra-permission"

export const metadata: Metadata = {
  title: "Extra Permission · SMS Admin",
}

export default async function Page({ params }: PageProps<"/users/[id]/extra-permission">) {
  const { id } = await params
  return (
    <RequirePlatform>
      <UserExtraPermission userId={Number(id)} />
    </RequirePlatform>
  )
}
