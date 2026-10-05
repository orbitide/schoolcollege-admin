"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { useLookupListHref } from "@/components/basic-settings/lookup/lookup-form"
import { lookupPages, type LookupKey } from "@/components/basic-settings/lookups"
import { StatusBadge } from "@/components/institutes/status-badge"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInstitute } from "@/lib/institutes-store"

// Legacy <Lookup> Details (deleted rows too): its institute, own fields, rank,
// status and who created / modified it.
export function LookupDetail({ lookup, id }: { lookup: LookupKey; id: number }) {
  const page = lookupPages[lookup]
  const { row, denied } = page.store.useDetails(id)
  const institute = useInstitute(row?.instituteId ?? -1)
  const listHref = useLookupListHref(page.segment)

  if (denied) return <NoAccess />
  if (row === undefined) return <PageLoader label={`Loading ${page.singular.toLowerCase()}`} />

  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href={listHref}>
        <ArrowLeftIcon data-icon="inline-start" />
        {page.plural}
      </Link>
    </Button>
  )
  if (!row)
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
        {back}
        <p className="text-sm text-muted-foreground">No {page.singular} found.</p>
      </div>
    )

  const deleted = row.recordStatus === "Deleted"
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB")
  const rows: [string, React.ReactNode][] = [
    ["Name", row.name],
    ...(page.details?.(row) ?? []),
    ["Institute", institute?.name ?? "—"],
    ["Rank", deleted ? "—" : row.rank],
    ["Status", <StatusBadge key="status" status={row.recordStatus} />],
    ["Created by", row.createdBy || "—"],
    ["Creation date", when(row.createdAt)],
    ["Modified by", row.modifiedBy || "—"],
    ["Modification date", when(row.modifiedAt)],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      {back}
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{row.name}</CardTitle>
          <CardDescription>{page.singular} details</CardDescription>
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
