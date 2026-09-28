import type { Metadata } from "next"

import { InstituteWiseUserForm } from "@/components/basic-settings/user-institute-forms"

export const metadata: Metadata = {
  title: "Add institute wise user · SMS Admin",
}

// ?institute= opens with that institute picked, to edit its users.
export default async function InstituteWiseUserPage({
  searchParams,
}: PageProps<"/basic-settings/user-institutes/institute-wise">) {
  const { institute } = await searchParams
  const instituteId = Number(Array.isArray(institute) ? institute[0] : institute) || undefined

  return <InstituteWiseUserForm initialInstituteId={instituteId} />
}
