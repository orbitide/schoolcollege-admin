import type { Metadata } from "next"

import { HolidayForm } from "@/components/holidays/holiday-form"
import { HOLIDAYS_RESOURCE } from "@/components/holidays/holiday-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit holiday and event · SMS Admin",
}

export default async function EditHolidayPage({
  params,
  searchParams,
}: PageProps<"/basic-settings/holidays/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={HOLIDAYS_RESOURCE} surface={["Admin", "Manage"]}>
      <HolidayForm id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
