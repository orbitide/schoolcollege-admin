"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import {
  kindConfig,
  kindLabels,
  visibleFields,
  type AcademicKind,
  type EditableRecord,
  type FieldDef,
} from "@/components/institutes/academic/kinds"
import { NotFound } from "@/components/institutes/academic/record-list"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useInstitute } from "@/lib/institutes-store"

// Legacy Details page of a record of a `softDelete` kind (deleted ones
// included): its fields, rank, status and who created / modified it.
// Back leads to the admin list it was opened from (`?returnTo=`), else the
// institute's tab.
export function RecordDetail({
  instituteId,
  kind,
  recordId,
}: {
  instituteId: number
  kind: AcademicKind
  recordId: number
}) {
  const config = kindConfig(kind)
  const institute = useInstitute(instituteId)
  const record = config.store.useOne(recordId)
  const returnTo = useSearchParams().get("returnTo")
  const base = `/institutes/${instituteId}/${config.segment}`
  const listHref =
    returnTo?.startsWith("/basic-settings/") || returnTo?.startsWith("/configurations/") || returnTo?.startsWith("/fees/") || returnTo?.startsWith("/routine/")
      ? returnTo
      : base

  if (!institute) return <NotFound />
  const { singular, plural } = kindLabels(kind, institute)
  if (!record || record.instituteId !== instituteId) return <NotFound what={singular} />

  const deleted = record.status === "Deleted"
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-GB") : "—")
  const rows: [string, React.ReactNode][] = [
    [config.nameLabel ?? "Name", record.name],
    ["Institute", institute.name],
    ...visibleFields(kind, institute).map(
      (field): [string, React.ReactNode] => [
        field.label,
        <FieldValue key={field.key} field={field} record={record} />,
      ]
    ),
    ["Rank", deleted || config.ranked === false ? "—" : record.rank],
    ["Status", <StatusBadge key="status" status={record.status} />],
    ["Created by", record.createdBy ?? "—"],
    ["Creation date", when(record.createdAt)],
    ["Modified by", record.modifiedBy ?? "—"],
    ["Modification date", when(record.modifiedAt)],
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            {plural}
          </Link>
        </Button>
        {!deleted && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`${base}/${record.id}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{record.name}</CardTitle>
          <CardDescription>{singular} details</CardDescription>
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

      {config.detailSection?.(record)}
    </div>
  )
}

function FieldValue({ field, record }: { field: FieldDef; record: EditableRecord }) {
  const value = record[field.key]
  if (field.source) return <SourceNames field={field} value={value} />
  if (field.type === "checkbox") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  if (value === "" || value == null) return field.allLabel ?? "—"
  return String(value)
}

// Names of the records a record / multiselect field points at.
function SourceNames({ field, value }: { field: FieldDef; value: unknown }) {
  const all = field.source!.useAll()
  const ids = (Array.isArray(value) ? value : value == null ? [] : [value]).map(Number)
  const names = all.filter((r) => ids.includes(r.id)).map((r) => r.name)
  return names.length ? names.join(", ") : "—"
}
