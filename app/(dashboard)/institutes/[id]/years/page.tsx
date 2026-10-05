import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/years">) {
  const { id } = await params
  redirect(instituteSettingsHref("years", Number(id)))
}
