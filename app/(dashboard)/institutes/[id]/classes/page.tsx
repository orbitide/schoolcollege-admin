import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/classes">) {
  const { id } = await params
  redirect(instituteSettingsHref("classes", Number(id)))
}
