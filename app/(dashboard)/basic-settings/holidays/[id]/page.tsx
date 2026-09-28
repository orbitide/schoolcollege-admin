import type { Metadata } from "next"

import { HolidayDetail } from "@/components/holidays/holiday-detail"
import { HOLIDAYS_RESOURCE } from "@/components/holidays/holiday-list"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Holiday and event · SMS Admin",
}

export default async function HolidayDetailPage({
  params,
  searchParams,
}: PageProps<"/basic-settings/holidays/[id]">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource={HOLIDAYS_RESOURCE} surface={["Admin", "Manage", "View"]}>
      <HolidayDetail id={Number(id)} returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />
    </RequireSurface>
  )
}
