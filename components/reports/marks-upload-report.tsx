"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { monthYear, ReportHeading } from "@/components/reports/result-summary-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { subjectStore } from "@/lib/academic-store"
import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import {
  marksUploadReport,
  SUBJECTS_PER_PAGE,
  sumCounts,
  type UploadCounts,
  type UploadRow,
} from "@/lib/marks-upload-report"
import { downloadCsv } from "@/lib/sms-messages"
import { useTermExamMarks } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const parts = [
  ["theory", "Theory"],
  ["cq", "CQ"],
  ["mcq", "MCQ"],
  ["practical", "Practical"],
] as const

// Legacy Partial/_marksUploadReport: pages of 32 subjects, each with the
// institute heading, exam, class and exam month, then per subject how many
// marks were entered in each part ("-" for none), and the page's totals.
function MarksUploadSheet({
  institute,
  branch,
  academicClass,
  exam,
  rows,
  subjectLabel,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  rows: UploadRow[]
  subjectLabel: (id: number) => string
}) {
  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-1 text-center tabular-nums"
  const pages = Array.from({ length: Math.ceil(rows.length / SUBJECTS_PER_PAGE) }, (_, p) =>
    rows.slice(p * SUBJECTS_PER_PAGE, (p + 1) * SUBJECTS_PER_PAGE)
  )
  const counts = (c: UploadCounts, cell: string) => (
    <>
      {parts.map(([key]) => (
        <td key={key} className={cell}>
          {c[key] || "-"}
        </td>
      ))}
      <td className={cell}>{c.total}</td>
      <td className={cell}>{c.students}</td>
    </>
  )

  return (
    <div className="flex flex-col gap-10 bg-white font-serif text-black">
      {pages.map((page, p) => (
        <section key={p} className="break-after-page last:break-after-auto">
          <ReportHeading
            institute={institute}
            branch={branch}
            exam={exam}
            title="Marks Upload Report"
            details={[
              ["Exam Name", exam.name],
              ["Class", academicClass?.name ?? "—"],
              ["Exam Date", monthYear(exam.examStart)],
            ]}
          />
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={cn(th, "w-12")}>Sl</th>
                <th className={th}>Subject</th>
                {parts.map(([key, label]) => (
                  <th key={key} className={th}>
                    {label}
                  </th>
                ))}
                <th className={th}>Total</th>
                <th className={th}>Students</th>
              </tr>
            </thead>
            <tbody>
              {page.map((row, i) => (
                <tr key={row.subjectId}>
                  <td className={td}>{p * SUBJECTS_PER_PAGE + i + 1}</td>
                  <td className={cn(td, "text-left")}>{subjectLabel(row.subjectId)}</td>
                  {counts(row, td)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className={cn(td, "text-right")} colSpan={2}>
                  Total
                </td>
                {counts(sumCounts(page), td)}
              </tr>
            </tfoot>
          </table>
        </section>
      ))}
    </div>
  )
}

// Legacy RptResult/MarksUploadReport: pick an exam and see, per subject,
// how many marks were entered in each part — what is still to be uploaded.
// Any exam can be reported; it works on the saved marks.
export function MarksUploadReport() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass, branch } = f
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const byId = new Map(subjects.map((s) => [s.id, s]))
  // Legacy "ShortName (SubjectCode)".
  const subjectLabel = (id: number) => {
    const s = byId.get(id)
    return s ? (s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name) : name("subject", id)
  }

  const rows = chosen ? marksUploadReport(chosen, marks) : undefined

  function exportCsv() {
    if (!chosen || !rows) return
    downloadCsv(
      `marks-upload-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      ["Sl", "Subject", "Theory", "CQ", "MCQ", "Practical", "Total", "Students"],
      [
        ...rows.map((r, i) => [i + 1, subjectLabel(r.subjectId), r.theory, r.cq, r.mcq, r.practical, r.total, r.students]),
        ...[sumCounts(rows)].map((t) => ["", "Total", t.theory, t.cq, t.mcq, t.practical, t.total, t.students]),
      ]
    )
  }

  const empty = rows && !rows.length
  const sheet = institute && chosen && rows && !empty && (
    <MarksUploadSheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      rows={rows}
      subjectLabel={subjectLabel}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Marks Upload Report</CardTitle>
          <CardDescription>
            How many marks have been entered in each part of each subject of an exam.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Term Exam Marks Upload</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${rows.length} subject${rows.length === 1 ? "" : "s"} with marks`
                : "Pick an exam to see its uploaded marks."}
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
            <ExamReportEmpty filter={f} empty={!!empty} emptyMessage="No marks uploaded for this exam yet" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
