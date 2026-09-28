import type { Metadata } from "next"

import { HolidayForm } from "@/components/holidays/holiday-form"
import { HOLIDAYS_RESOURCE } from "@/components/holidays/holiday-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Add holiday and event · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function NewHolidayPage({
  searchParams,
}: PageProps<"/basic-settings/holidays/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource={HOLIDAYS_RESOURCE} surface={["Admin", "Manage"]}>
      <HolidayForm
        initialInstituteId={Number(one(query.institute)) || undefined}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
