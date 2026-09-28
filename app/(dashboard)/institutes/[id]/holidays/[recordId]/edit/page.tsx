import type { Metadata } from "next"

import { HolidayForm } from "@/components/holidays/holiday-form"
import { HOLIDAYS_RESOURCE } from "@/components/holidays/holiday-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Edit holiday and event · SMS Admin",
}

export default async function EditHolidaysPage({
  params,
}: PageProps<"/institutes/[id]/holidays/[recordId]/edit">) {
  const { id, recordId } = await params

  return (
    <RequireSurface resource={HOLIDAYS_RESOURCE} surface={["Admin", "Manage"]}>
      <HolidayForm instituteId={Number(id)} id={Number(recordId)} />
    </RequireSurface>
  )
}
