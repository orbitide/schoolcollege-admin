import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { UserForm } from "@/components/users/user-form"

export const metadata: Metadata = {
  title: "Update User · SMS Admin",
}

export default async function Page({ params }: PageProps<"/users/[id]/edit">) {
  const { id } = await params
  return (
    <RequirePlatform>
      <UserForm userId={Number(id)} />
    </RequirePlatform>
  )
}
