import type { Metadata } from "next"

import { InstituteConfigurationForm } from "@/components/institutes/institute-configuration-form"

export const metadata: Metadata = {
  title: "Institute configuration · SMS Admin",
}

export default async function InstituteConfigurationPage({
  params,
}: PageProps<"/institutes/[id]/configuration">) {
  const { id } = await params

  return <InstituteConfigurationForm id={Number(id)} />
}
