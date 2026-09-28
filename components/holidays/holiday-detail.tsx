"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { HOLIDAYS_HREF, HOLIDAYS_RESOURCE } from "@/components/holidays/holiday-list"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { classStore } from "@/lib/academic-store"
import { surfaceHref, useSurfaces } from "@/lib/access"
import { dayCount, formatDateRange, useHoliday } from "@/lib/holidays"
import { useInstitute } from "@/lib/institutes-store"

// Legacy HolidayAndEventSettings/Details, deleted ones included.
export function HolidayDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const holiday = useHoliday(id)
  const institute = useInstitute(holiday?.instituteId ?? -1)
  const academicClass = classStore.useOne(holiday?.classId ?? -1)
  const surfaces = useSurfaces(HOLIDAYS_RESOURCE)
  const canEdit = surfaces.some((surface) => surface !== "View")
  const listHref = returnTo?.startsWith("/")
    ? returnTo
    : surfaceHref(HOLIDAYS_HREF, surfaces[0] ?? "View")

  if (!holiday || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Holiday and event not found</h2>
        <p className="text-sm text-muted-foreground">It may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to holidays and events</Link>
        </Button>
      </div>
    )
  }

  const deleted = holiday.status === "Deleted"
  const rows: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ...(institute.enableMedium
      ? ([["Academic medium", holiday.medium || "All"]] as [string, React.ReactNode][])
      : []),
    ["Academic class", holiday.classId == null ? "All" : (academicClass?.name ?? "—")],
    ["Date", `${formatDateRange(holiday.startDate, holiday.endDate)} (${dayCount(holiday.startDate, holiday.endDate)})`],
    ["Type", holiday.type],
    ["Repetition", holiday.repetition],
    ["Description", holiday.description || "—"],
    ["Rank", deleted ? "—" : holiday.rank],
    ["Created by", holiday.createdBy],
    ["Creation date", new Date(holiday.createdAt).toLocaleString("en-GB")],
    ["Modified by", holiday.modifiedBy],
    ["Modification date", new Date(holiday.modifiedAt).toLocaleString("en-GB")],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Holidays and events
          </Link>
        </Button>
        {!deleted && canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`${HOLIDAYS_HREF}/${holiday.id}/edit?returnTo=${encodeURIComponent(listHref)}`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{holiday.name}</CardTitle>
            <StatusBadge status={holiday.status} />
          </div>
          <CardDescription>Holiday and event details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-y-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
