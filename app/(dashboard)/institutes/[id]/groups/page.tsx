import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/groups">) {
  const { id } = await params
  redirect(instituteSettingsHref("groups", Number(id)))
}
