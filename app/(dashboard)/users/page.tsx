import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { UserList } from "@/components/users/user-list"

export const metadata: Metadata = {
  title: "Users · SMS Admin",
}

export default function Page() {
  return (
    <RequirePlatform>
      <UserList />
    </RequirePlatform>
  )
}
