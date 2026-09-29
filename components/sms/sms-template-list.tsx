"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { HighlightedMessage, SmsLengthSummary } from "@/components/sms/sms-message"
import { SmsTemplateActions } from "@/components/sms/sms-template-actions"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { branchStore } from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import {
  fillTemplate,
  smsTypes,
  unknownKeywords,
  useSmsTemplates,
} from "@/lib/sms-templates"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage SMS Template (Admin)",
  Manage: "Manage SMS Template",
  View: "View SMS Template",
}

// Legacy Sms/ManageSmsTemplate: each institute's SMS templates by type, with
// the keywords they fill. The surface decides the actions: Manage adds,
// edits and (in)activates; Admin also deletes, sees deleted templates and
// retrieves them; View only reads.
export function SmsTemplateList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: "sms-template", softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const templates = useSmsTemplates()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const branches = branchStore.useList(institute?.id ?? -1)
  const withDeleted = can.restore && param("deleted") === "1"
  const type = param("type")
  const branch = param("branch")

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const rows = templates
    .filter(
      (t) =>
        allowed.has(t.instituteId) &&
        (!institute || t.instituteId === institute.id) &&
        (withDeleted || t.status !== "Deleted") &&
        (!type || t.smsType === type) &&
        // A branch shows its own templates and those for every branch.
        (!branch || t.branchId == null || String(t.branchId) === branch) &&
        (!needle || [t.name, t.message].some((value) => value.toLowerCase().includes(needle)))
    )
    .sort(
      (a, b) =>
        a.instituteId - b.instituteId ||
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        smsTypes.indexOf(a.smsType) - smsTypes.indexOf(b.smsType) ||
        a.name.localeCompare(b.name)
    )

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const newHref = `/sms/templates/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    ...(type && { type }),
    returnTo,
  })}`
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  const branchName = (instituteId: number, id: number | null) =>
    id == null
      ? "All branches"
      : (branchStore.getList(instituteId).find((b) => b.id === id)?.name ?? "—")
  const showBranch = rows.some((t) => t.branchId != null) || !!institute?.enableBranch
  const columnCount = 9 + (institute ? 0 : 1) + (showBranch ? 1 : 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>
              Reusable messages for each SMS type. Keywords such as [&#123;Name&#125;] are filled in
              for every student when the SMS is sent.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource="sms-template" baseUrl="/sms/templates" current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add template
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, branch: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={branch}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          <FilterField
            label="SMS type"
            value={type}
            onChange={(v) => setParam({ type: v })}
            options={smsTypes.map((t) => ({ value: t, label: t }))}
            allLabel="All types"
          />
          {can.restore && (
            <FilterField
              label="Deleted templates"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
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
                placeholder="Search name or message"
                aria-label="Search templates"
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
              {!institute && <TableHead>Institute</TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>SMS type</TableHead>
              {showBranch && <TableHead>Branch</TableHead>}
              <TableHead className="min-w-72">Message</TableHead>
              <TableHead>Length</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((template, index) => {
                const edited = template.createdAt !== template.modifiedAt
                const deleted = template.status === "Deleted"
                const sub = template.resultType ?? template.attendanceType
                return (
                  <TableRow key={template.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {!institute && (
                      <TableCell>{instituteName.get(template.instituteId) ?? "—"}</TableCell>
                    )}
                    <TableCell className="font-medium whitespace-nowrap">{template.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {template.smsType}
                        {sub && (
                          <Badge variant="outline" className="px-1.5 text-muted-foreground">
                            {sub}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {showBranch && (
                      <TableCell className="whitespace-nowrap">
                        {branchName(template.instituteId, template.branchId)}
                      </TableCell>
                    )}
                    <TableCell className="max-w-md min-w-72 whitespace-normal">
                      <HighlightedMessage
                        message={template.message}
                        unknown={unknownKeywords(template.smsType, template.message)}
                        className="line-clamp-2 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      <SmsLengthSummary text={fillTemplate(template.message)} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {edited ? (
                        <>
                          <div>Cr: {template.createdBy}</div>
                          <div>Mo: {template.modifiedBy}</div>
                        </>
                      ) : (
                        template.createdBy
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(template.createdAt)}</div>
                          <div>Mo: {stamp(template.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(template.createdAt)
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={template.status} />
                    </TableCell>
                    <TableCell>
                      <SmsTemplateActions template={template} returnTo={returnTo} can={can} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No SMS templates match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Length is counted with sample values filled in; real names and dates change it slightly.
      </p>
    </div>
  )
}
