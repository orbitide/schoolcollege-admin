import type { Metadata } from "next"

import { RequirePlatform } from "@/components/require-platform"
import { UserList } from "@/components/users/user-list"

export const metadata: Metadata = {
  title: "Users · SMS Admin",
}

// ?searchKey= opens the list searched, as legacy Users/Index does (e.g. a
// role's users from Manage User Roles).
export default async function Page({ searchParams }: PageProps<"/users">) {
  const { searchKey } = await searchParams
  const key = (Array.isArray(searchKey) ? searchKey[0] : searchKey)?.trim() ?? ""
  return (
    <RequirePlatform>
      <UserList key={key} initialSearch={key} />
    </RequirePlatform>
  )
}
