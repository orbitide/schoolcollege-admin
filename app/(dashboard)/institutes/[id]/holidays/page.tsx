import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/holidays">) {
  const { id } = await params
  redirect(instituteSettingsHref("holidays", Number(id)))
}
