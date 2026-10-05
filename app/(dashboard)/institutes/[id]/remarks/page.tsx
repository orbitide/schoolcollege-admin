import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/remarks">) {
  const { id } = await params
  redirect(instituteSettingsHref("remarks", Number(id)))
}
