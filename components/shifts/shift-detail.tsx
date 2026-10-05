"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { useShiftListHref } from "@/components/shifts/shift-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInstitute } from "@/lib/institutes-store"
import { useShiftDetails } from "@/lib/shifts-store"

// Legacy Shift Details (deleted shifts too): its institute, rank, status and
// who created / modified it.
export function ShiftDetail({ id }: { id: number }) {
  const { shift, denied } = useShiftDetails(id)
  const institute = useInstitute(shift?.instituteId ?? -1)
  const listHref = useShiftListHref()

  if (denied) return <NoAccess />
  if (shift === undefined) return <PageLoader label="Loading shift" />

  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href={listHref}>
        <ArrowLeftIcon data-icon="inline-start" />
        Shifts
      </Link>
    </Button>
  )
  if (!shift)
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
        {back}
        <p className="text-sm text-muted-foreground">Invalid Shift.</p>
      </div>
    )

  const deleted = shift.recordStatus === "Deleted"
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB")
  const rows: [string, React.ReactNode][] = [
    ["Name", shift.name],
    ["Institute", institute?.name ?? "—"],
    ["Rank", deleted ? "—" : shift.rank],
    ["Status", <StatusBadge key="status" status={shift.recordStatus} />],
    ["Created by", shift.createdBy || "—"],
    ["Creation date", when(shift.createdAt)],
    ["Modified by", shift.modifiedBy || "—"],
    ["Modification date", when(shift.modifiedAt)],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      {back}
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{shift.name}</CardTitle>
          <CardDescription>Shift details</CardDescription>
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
