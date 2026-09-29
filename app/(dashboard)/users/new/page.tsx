import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { UserForm } from "@/components/users/user-form"

export const metadata: Metadata = {
  title: "New User · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <UserForm />
    </RequirePlatform>
  )
}
