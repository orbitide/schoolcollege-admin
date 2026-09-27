import type { Metadata } from "next"

import { InstituteForm } from "@/components/institutes/institute-form"

export const metadata: Metadata = {
  title: "Edit institute · SMS Admin",
}

export default async function EditInstitutePage({
  params,
}: PageProps<"/institutes/[id]/edit">) {
  const { id } = await params

  return <InstituteForm id={Number(id)} />
}
