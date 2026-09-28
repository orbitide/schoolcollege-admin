"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { DISTRICTS_HREF } from "@/components/basic-settings/district-list"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDistrict } from "@/lib/districts"

// Legacy District/Details, deleted districts included.
export function DistrictDetail({ id }: { id: number }) {
  const district = useDistrict(id)

  if (!district) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">No district found</h2>
        <p className="text-sm text-muted-foreground">It may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={DISTRICTS_HREF}>Back to districts</Link>
        </Button>
      </div>
    )
  }

  const deleted = district.status === "Deleted"
  const rows: [string, React.ReactNode][] = [
    ["Name", district.name],
    ["Bangla name", district.nameBn || "—"],
    ["Status", <StatusBadge key="status" status={district.status} />],
    ["Rank", deleted ? "—" : district.rank],
    ["Created by", district.createdBy],
    ["Creation date", new Date(district.createdAt).toLocaleString("en-GB")],
    ["Modified by", district.modifiedBy],
    ["Modification date", new Date(district.modifiedAt).toLocaleString("en-GB")],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={DISTRICTS_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            Districts
          </Link>
        </Button>
        {!deleted && (
          <Button asChild variant="outline" size="sm">
            <Link href={`${DISTRICTS_HREF}/${district.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{district.name}</CardTitle>
          <CardDescription>District details</CardDescription>
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
