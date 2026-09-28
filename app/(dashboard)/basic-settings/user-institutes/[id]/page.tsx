import type { Metadata } from "next"

import { UserInstituteDetail } from "@/components/basic-settings/user-institute-detail"

export const metadata: Metadata = {
  title: "User institute details · SMS Admin",
}

export default async function UserInstituteDetailPage({
  params,
}: PageProps<"/basic-settings/user-institutes/[id]">) {
  const { id } = await params
  return <UserInstituteDetail id={Number(id)} />
}
