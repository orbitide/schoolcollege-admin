import type { Metadata } from "next"

import { UserWiseInstituteForm } from "@/components/basic-settings/user-institute-forms"

export const metadata: Metadata = {
  title: "Add user wise institute · SMS Admin",
}

// ?user= opens with that user picked, to edit their institutes.
export default async function UserWiseInstitutePage({
  searchParams,
}: PageProps<"/basic-settings/user-institutes/user-wise">) {
  const { user } = await searchParams
  const userId = Number(Array.isArray(user) ? user[0] : user) || undefined

  return <UserWiseInstituteForm initialUserId={userId} />
}
