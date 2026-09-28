"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { AbsentSummarySheet } from "@/components/reports/absent-summary-sheet"
import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
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
import { absentSummary } from "@/lib/absent-summary"
import { subjectStore } from "@/lib/academic-store"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import { useTermExamMarks } from "@/lib/term-exam-marks"

// Legacy RptSummary/AbsentSummary: pick any exam of a class and year (it
// works on the marks, so no merit list is needed) and see, per section and
// subject, how many students have no marks in each part — with or without
// each student's optional subject (?optional=without).
export function AbsentSummary() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass, branch } = f
  const students = useStudents()
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const withoutOptional = f.param("optional") === "without"
  const showGroup = !!institute?.enableGroup && !!academicClass?.hasSubjectGroup

  const summary = chosen
    ? absentSummary(chosen, {
        students,
        marks,
        sections: f.sections,
        groups: f.groups,
        byGroup: showGroup,
        withoutOptional,
      })
    : undefined
  // The subject's short name, as the legacy column heads.
  const codeOf = new Map(subjects.map((s) => [s.id, s.code.trim() || s.name]))
  const subjectLabel = (id: number) => codeOf.get(id) ?? name("subject", id)

  function exportCsv() {
    if (!chosen || !summary) return
    const subjectIds = chosen.subjects
      .map((s) => s.subjectId)
      .filter((id) => summary.tables.some((t) => t.subjectIds.includes(id)))
    const leading = (group: string, version: string): string[] => [
      ...(showGroup ? [group] : []),
      ...(institute?.enableVersion ? [version] : []),
    ]
    const rows = summary.tables.flatMap((t) => {
      const group = t.groupId == null ? "—" : name("group", t.groupId)
      return [
        ...t.rows.flatMap((r) =>
          [...summary.parts, null].map((part) => [
            ...leading(group, r.version),
            name("section", r.sectionId),
            r.total,
            part ?? "All",
            ...subjectIds.map((id) => {
              const counts = r.subjects.get(id)
              return (part == null ? (counts?.all ?? 0) : counts?.parts[part]) ?? "-"
            }),
          ])
        ),
        [
          ...leading(group, ""),
          "Total",
          `${t.absent} / ${t.total}`,
          "",
          ...subjectIds.map((id) => (t.subjectIds.includes(id) ? (t.subjectAbsent.get(id) ?? 0) : "")),
        ],
      ]
    })
    downloadCsv(
      `absent-summary-${withoutOptional ? "without" : "with"}-optional-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [...leading("Group", "Version"), "Section", "Student", "Part", ...subjectIds.map(subjectLabel)],
      rows
    )
  }

  const empty = summary && !summary.tables.length
  const sheet = chosen && summary && institute && !empty && (
    <AbsentSummarySheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      summary={summary}
      withoutOptional={withoutOptional}
      showGroup={showGroup}
      name={name}
      subjectLabel={subjectLabel}
    />
  )
  const totalStudents = summary?.tables.reduce((sum, t) => sum + t.total, 0) ?? 0
  const totalAbsent = summary?.tables.reduce((sum, t) => sum + t.absent, 0) ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Absent Summary</CardTitle>
          <CardDescription>
            How many students of each section have no marks in each part of each subject of an exam.
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
            <CardTitle>Absent Summary Report</CardTitle>
            <CardDescription>
              {summary && chosen && !empty
                ? `${chosen.fullName} · ${totalStudents} students · ${totalAbsent} subject absence${totalAbsent === 1 ? "" : "s"} · ${withoutOptional ? "without" : "with"} optional`
                : "Pick an exam to see who has no marks in it."}
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
              <div className="min-w-[40rem]">{sheet}</div>
            </div>
          ) : (
            <ExamReportEmpty filter={f} empty={!!empty} emptyMessage="Absent Summary Not Found." />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
