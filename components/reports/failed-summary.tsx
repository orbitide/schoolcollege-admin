"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { FailedSummarySheet } from "@/components/reports/failed-summary-sheet"
import { PrintArea } from "@/components/reports/print-area"
import { useStudentLookups } from "@/components/students/student-lookups"
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
import { subjectStore } from "@/lib/academic-store"
import { failedSummary, type FailedCounts } from "@/lib/failed-summary"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"

// Legacy RptSummary/FailedSummary: pick an exam whose merit list is
// generated and see, per section and subject, how many failed or were
// absent — with or without each student's optional subject (?optional=without).
export function FailedSummary() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass, branch } = f
  const students = useStudents()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const withoutOptional = f.param("optional") === "without"
  const grouped = !!institute?.enableGroup && !!academicClass?.hasSubjectGroup

  const summary =
    chosen && list
      ? failedSummary(chosen, list, students, f.sections, f.groups, { grouped, withoutOptional })
      : undefined
  // The subject's short name, as the legacy column heads.
  const codeOf = new Map(subjects.map((s) => [s.id, s.code.trim() || s.name]))
  const subjectLabel = (id: number) => codeOf.get(id) ?? name("subject", id)

  function exportCsv() {
    if (!chosen || !summary) return
    const subjectIds = chosen.subjects.map((s) => s.subjectId).filter((id) =>
      summary.tables.some((t) => t.subjectIds.includes(id))
    )
    const counts = (c: FailedCounts, bySubject: Map<number, FailedCounts>): (string | number)[] => [
      c.total,
      c.failed,
      c.absent,
      ...subjectIds.flatMap((id): (string | number)[] => {
        const s = bySubject.get(id)
        return s ? [s.failed, s.absent] : ["", ""]
      }),
    ]
    const leading = (group: string, version: string): string[] => [
      ...(grouped ? [group] : []),
      ...(institute?.enableVersion ? [version] : []),
    ]
    const rows = summary.tables.flatMap((t) => {
      const group = t.groupId == null ? "All Group" : name("group", t.groupId)
      return [
        ...t.rows.map((r) => [...leading(group, r.version), name("section", r.sectionId), ...counts(r, r.subjects)]),
        [...leading(group, ""), "Total", ...counts(t.total, t.total.subjects)],
      ]
    })
    if (summary.grandTotal) {
      rows.push([...leading("", ""), "Grand Total", ...counts(summary.grandTotal, summary.grandTotal.subjects)])
    }
    downloadCsv(
      `failed-summary-${withoutOptional ? "without" : "with"}-optional-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [
        ...leading("Group", "Version"),
        "Section",
        "Total Student",
        "Total Failed",
        "Total Absent",
        ...subjectIds.flatMap((id) => [`${subjectLabel(id)} Failed`, `${subjectLabel(id)} Absent`]),
      ],
      rows
    )
  }

  const empty = summary && !summary.tables.length
  const sheet = chosen && summary && institute && !empty && (
    <FailedSummarySheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      summary={summary}
      withoutOptional={withoutOptional}
      subjectLabel={subjectLabel}
      name={name}
    />
  )
  const totalStudents = summary?.tables.reduce((sum, t) => sum + t.total.total, 0) ?? 0
  const totalFailed = summary?.tables.reduce((sum, t) => sum + t.total.failed, 0) ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Failed Summary</CardTitle>
          <CardDescription>
            How many students of each section failed or were absent in each subject of an exam.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <Field orientation="horizontal" className="self-end pb-2">
            <Checkbox
              id="without-optional"
              checked={withoutOptional}
              onCheckedChange={(checked) => f.setParam({ optional: checked === true ? "without" : "" })}
            />
            <FieldLabel htmlFor="without-optional">Without optional subject</FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Failed Summary Report</CardTitle>
            <CardDescription>
              {summary && chosen && !empty
                ? `${chosen.fullName} · ${totalStudents} students · ${totalFailed} failed · ${withoutOptional ? "without" : "with"} optional`
                : "Only exams with a generated merit list can be reported."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheet}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[56rem]">{sheet}</div>
            </div>
          ) : (
            <ExamReportEmpty filter={f} empty={!!empty} />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="356mm 216mm">{sheet}</PrintArea>}
    </div>
  )
}
