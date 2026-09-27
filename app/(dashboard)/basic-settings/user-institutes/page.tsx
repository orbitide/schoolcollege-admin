import type { Metadata } from "next"

import { UserInstituteList } from "@/components/basic-settings/user-institute-list"

export const metadata: Metadata = {
  title: "User Institutes · SMS Admin",
}

export default function UserInstitutesPage() {
  return <UserInstituteList />
}
