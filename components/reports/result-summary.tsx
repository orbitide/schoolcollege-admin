"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { ResultSummarySheet } from "@/components/reports/result-summary-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { passPercent, resultSummary, type ResultCounts } from "@/lib/result-summary"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"

// Legacy RptSummary/ResultSummary ("Result at a glance"): pick an exam whose
// merit list is generated and see its results per section. The report
// follows the filters as they change.
export function ResultSummary() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass, branch } = f
  const students = useStudents()
  const name = useStudentLookups()
  const summary = chosen && list ? resultSummary(chosen, list, students, f.sections, f.groups) : undefined

  function exportCsv() {
    if (!chosen || !summary) return
    const counts = (c: ResultCounts) => [
      c.total,
      c.appeared,
      ...(chosen.calculateGpa ? c.grades : []),
      c.passed,
      c.failed,
      c.absent,
      passPercent(c).toFixed(2),
    ]
    const grouped = institute?.enableGroup && academicClass?.hasSubjectGroup
    downloadCsv(
      `result-at-a-glance-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [
        ...(grouped ? ["Group"] : []),
        ...(institute?.enableVersion ? ["Version"] : []),
        "Section",
        "Total Student",
        "Total Appeared",
        ...(chosen.calculateGpa ? summary.grades.map((g) => `GPA ${g.name}`) : []),
        "Total Passed",
        "Total Failed",
        "Total Absent",
        "Passed Percentage",
      ],
      [
        ...summary.rows.map((r) => [
          ...(grouped ? [name("group", r.groupId)] : []),
          ...(institute?.enableVersion ? [r.version] : []),
          name("section", r.sectionId),
          ...counts(r),
        ]),
        [...(grouped ? [""] : []), ...(institute?.enableVersion ? [""] : []), "Total", ...counts(summary.total)],
      ]
    )
  }

  const empty = summary && !summary.rows.length
  const sheet = chosen && summary && institute && !empty && (
    <ResultSummarySheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      summary={summary}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Result at a glance</CardTitle>
          <CardDescription>
            How many students of each section sat the exam, passed, failed or were absent, and how
            many passed with each grade.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Result Summary Report</CardTitle>
            <CardDescription>
              {summary && chosen
                ? `${chosen.fullName} · ${summary.rows.length} section${summary.rows.length === 1 ? "" : "s"} · ${summary.total.total} students`
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
              <div className="min-w-[48rem]">{sheet}</div>
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
