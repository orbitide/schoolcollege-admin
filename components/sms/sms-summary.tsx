"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { SmsSummarySheet } from "@/components/sms/sms-summary-sheet"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { downloadCsv, useSmsMessages } from "@/lib/sms-messages"
import {
  readSummaryFilter,
  smsSummary,
  summaryDisplayTypes,
  summaryParams,
  summaryProblems,
  summaryTotal,
  type SummaryFilter,
} from "@/lib/sms-summary"
import { smsAttendanceTypes, smsResultTypes, smsTypes, subTypeOf } from "@/lib/sms-templates"
import { todayIso } from "@/lib/student-attendance"

// The institutes the summary covers and the summary itself, shared by the
// page and its print view.
export function useSmsSummary(params: Pick<URLSearchParams, "get">) {
  const institutes = useAccessibleInstitutes()
  const messages = useSmsMessages()
  const read = readSummaryFilter(params, todayIso())
  // A user of one institute always sees that one.
  const filter: SummaryFilter & { details: boolean } =
    institutes.length === 1 ? { ...read, instituteId: institutes[0].id } : read
  const institute = institutes.find((i) => i.id === filter.instituteId)
  const byId = new Map(institutes.map((i) => [i.id, i]))
  const rows = smsSummary(
    messages,
    filter,
    new Set(byId.keys()),
    (id) => byId.get(id)?.configuration.smsRate ?? 0
  )
  return { institutes, institute, filter, rows }
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = React.useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </FieldLabel>
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

// Legacy Sms/CombineSmsReport ("SMS Summary"): SMS counts by status for a
// date range, per day, month, year or SMS type. The report follows the
// filters as they change; Print opens it on its own page.
export function SmsSummary() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { institutes, institute, filter, rows } = useSmsSummary(searchParams)
  const sub = subTypeOf(filter.smsType)
  const problems = summaryProblems(filter)
  const params = summaryParams(filter).toString()

  function set(updates: Partial<typeof filter>) {
    const next = { ...filter, ...updates }
    router.replace(`${pathname}?${summaryParams(next)}`)
  }

  function exportCsv() {
    const total = summaryTotal(rows)
    const line = (r: typeof total) => [
      r.label,
      r.Pending.count,
      r.Pending.parts,
      r.Sent.count,
      r.Sent.parts,
      r.Failed.count,
      r.Failed.parts,
      r.total.count,
      r.total.parts,
      r.cost.toFixed(2),
    ]
    downloadCsv(
      `sms-summary-${filter.displayBy.toLowerCase().replaceAll(" ", "-")}-${filter.dateFrom}-to-${filter.dateTo}.csv`,
      [
        filter.displayBy === "SMS Type wise" ? "SMS type" : "Date",
        "Pending",
        "Pending length",
        "Success",
        "Success length",
        "Failed",
        "Failed length",
        "Total SMS",
        "Total length",
        "Cost (BDT)",
      ],
      [...rows.map(line), ...(rows.length > 1 ? [line(total)] : [])]
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">SMS Summary</CardTitle>
          <CardDescription>
            How many SMS were pending, sent and failed, and how many SMS parts they took.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              value={filter.instituteId != null ? String(filter.instituteId) : ""}
              onChange={(v) => set({ instituteId: v ? Number(v) : null })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          <DateField label="Date from" value={filter.dateFrom} onChange={(v) => set({ dateFrom: v })} />
          <DateField label="Date to" value={filter.dateTo} onChange={(v) => set({ dateTo: v })} />
          <FilterField
            label="SMS type"
            value={filter.smsType}
            onChange={(v) => set({ smsType: v as typeof filter.smsType, resultType: "", attendanceType: "" })}
            options={smsTypes.map((t) => ({ value: t, label: t }))}
            allLabel="All types"
          />
          {sub === "result" && (
            <FilterField
              label="Result type"
              value={filter.resultType}
              onChange={(v) => set({ resultType: v as typeof filter.resultType })}
              options={smsResultTypes.map((t) => ({ value: t, label: t }))}
              allLabel="All"
            />
          )}
          {sub === "attendance" && (
            <FilterField
              label="Attendance type"
              value={filter.attendanceType}
              onChange={(v) => set({ attendanceType: v as typeof filter.attendanceType })}
              options={smsAttendanceTypes.map((t) => ({ value: t, label: t }))}
              allLabel="All"
            />
          )}
          <FilterField
            label="Display by"
            required
            value={filter.displayBy}
            onChange={(v) => set({ displayBy: v as typeof filter.displayBy })}
            options={summaryDisplayTypes.map((t) => ({ value: t, label: t }))}
          />
          <Label className="self-end pb-2 font-normal">
            <Checkbox
              checked={filter.details}
              onCheckedChange={(checked) => set({ details: checked === true })}
            />
            Details (SMS parts per status)
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>SMS Report</CardTitle>
            <CardDescription>
              {rows.length
                ? `${rows.length} ${filter.displayBy === "SMS Type wise" ? "SMS type" : "period"}${rows.length === 1 ? "" : "s"}.`
                : "Nothing in this range yet."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button asChild size="sm" variant="outline" disabled={!!problems.length}>
              <Link href={`/print/sms-summary?${params}`} target="_blank">
                <PrinterIcon data-icon="inline-start" />
                Print
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {problems.length ? (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {problems.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CircleAlertIcon className="size-4 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-md border p-4">
              <SmsSummarySheet
                institute={institute}
                filter={filter}
                rows={rows}
                details={filter.details}
                className="min-w-[36rem]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
