"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { useBranchListHref } from "@/components/branches/branch-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInstitute } from "@/lib/institutes-store"
import { useBranchDetails } from "@/lib/branches-store"

// Legacy Branch Details (deleted branches too): its institute, rank, status and
// who created / modified it.
export function BranchDetail({ id }: { id: number }) {
  const { branch, denied } = useBranchDetails(id)
  const institute = useInstitute(branch?.instituteId ?? -1)
  const listHref = useBranchListHref()

  if (denied) return <NoAccess />
  if (branch === undefined) return <PageLoader label="Loading branch" />

  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href={listHref}>
        <ArrowLeftIcon data-icon="inline-start" />
        Branches
      </Link>
    </Button>
  )
  if (!branch)
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
        {back}
        <p className="text-sm text-muted-foreground">No Branch found.</p>
      </div>
    )

  const deleted = branch.recordStatus === "Deleted"
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB")
  const rows: [string, React.ReactNode][] = [
    ["Name", branch.name],
    ["Code", branch.code],
    ["Address", branch.address || "—"],
    ["Institute", institute?.name ?? "—"],
    ["Rank", deleted ? "—" : branch.rank],
    ["Status", <StatusBadge key="status" status={branch.recordStatus} />],
    ["Created by", branch.createdBy || "—"],
    ["Creation date", when(branch.createdAt)],
    ["Modified by", branch.modifiedBy || "—"],
    ["Modification date", when(branch.modifiedAt)],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      {back}
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{branch.name}</CardTitle>
          <CardDescription>Branch details</CardDescription>
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
