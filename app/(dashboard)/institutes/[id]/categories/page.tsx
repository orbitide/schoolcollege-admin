import { redirect } from "next/navigation"

import { instituteSettingsHref } from "@/lib/basic-settings"

export default async function Page({ params }: PageProps<"/institutes/[id]/categories">) {
  const { id } = await params
  redirect(instituteSettingsHref("categories", Number(id)))
}
