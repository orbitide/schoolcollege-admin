import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/subjects">) {
  const { id } = await params
  redirect(instituteSettingsHref("subjects", Number(id)))
}
