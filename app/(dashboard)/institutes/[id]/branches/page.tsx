import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/branches">) {
  const { id } = await params
  redirect(instituteSettingsHref("branches", Number(id)))
}
