"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import { InstituteSurfaceActions } from "@/components/institutes/institute-surface-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { capabilitiesFor, type AccessSurface, type Capabilities } from "@/lib/access"
import { isPlatformAdmin, useCurrentUser } from "@/lib/current-user"
import { useInstituteSurface } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

export const INSTITUTES_RESOURCE = "settings.institutes"

const titles: Record<AccessSurface, string> = {
  Admin: "Institute Manage Admin",
  Manage: "Institute Manage",
  View: "Institute View",
}

// What a surface offers on institutes. Onboarding is a platform job, so
// creating, deleting and retrieving stay with the super admin whatever the
// surface; Admin / Manage holders edit, (in)activate and rerank their own.
export function useInstituteCapabilities(surface: AccessSurface): Capabilities {
  const platform = isPlatformAdmin(useCurrentUser())
  const can = capabilitiesFor(surface, { resource: INSTITUTES_RESOURCE, softDelete: true })
  return {
    ...can,
    create: can.create && platform,
    delete: can.delete && platform,
    restore: can.restore && platform,
  }
}

// Legacy Institute/Manage (Manage Admin), InstituteManage and
// InstituteManageView: the user's institutes in rank order. Admin also lists
// deleted institutes ("With deleted"); View only reads.
export function InstituteSurfaceList({ surface }: { surface: AccessSurface }) {
  const can = useInstituteCapabilities(surface)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Admin sees the deleted filter; only the platform can act on deleted rows.
  const deletedFilter = surface === "Admin"
  const withDeleted = deletedFilter && searchParams.get("deleted") === "1"
  const { rows: all, error } = useInstituteSurface(surface, withDeleted)

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const rows = (all ?? []).filter(
    (institute) =>
      !needle ||
      [institute.name, institute.shortName, institute.eiin, institute.email].some((value) =>
        value.toLowerCase().includes(needle)
      )
  )

  function setDeleted(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === "1") params.set("deleted", "1")
    else params.delete("deleted")
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const columnCount = 11

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Your institutes, in rank order.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource={INSTITUTES_RESOURCE} baseUrl="/institutes" current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href="/institutes/new">
                  <PlusIcon data-icon="inline-start" />
                  Add institute
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deletedFilter && (
            <FilterField
              label="Deleted institutes"
              value={withDeleted ? "1" : "0"}
              onChange={setDeleted}
              options={[
                { value: "0", label: "Without deleted" },
                { value: "1", label: "With deleted" },
              ]}
            />
          )}
          <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, short name, EIIN, email"
                aria-label="Search institutes"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short name</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>EIIN</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((institute, index) => {
                const edited = institute.createdAt !== institute.modifiedAt
                const deleted = institute.recordStatus === "Deleted"
                return (
                  <TableRow key={institute.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {deleted ? (
                        institute.name
                      ) : (
                        <Link
                          href={`/institutes/${institute.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {institute.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{institute.shortName}</TableCell>
                    <TableCell>
                      {institute.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a data URL from the form
                        <img src={institute.logoUrl} alt="" className="size-10 rounded object-contain" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{institute.eiin}</TableCell>
                    <TableCell>{institute.email}</TableCell>
                    <TableCell className="text-center tabular-nums">{institute.rank}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {institute.createdBy}</div>
                          <div>Mo: {institute.modifiedBy}</div>
                        </>
                      ) : (
                        institute.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(institute.createdAt ?? "")}</div>
                          <div>Mo: {stamp(institute.modifiedAt ?? "")}</div>
                        </>
                      ) : (
                        stamp(institute.createdAt ?? "")
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={institute.recordStatus} />
                    </TableCell>
                    <TableCell>
                      <InstituteSurfaceActions institute={institute} returnTo={returnTo} can={can} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {error ?? (all ? "No institutes match these filters." : "Loading…")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
