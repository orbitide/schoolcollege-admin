"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { ResultAnalysisSheet } from "@/components/reports/result-analysis-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { subjectStore } from "@/lib/academic-store"
import { analysisPercent, resultAnalysis } from "@/lib/result-analysis"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import { useTermExamMarks } from "@/lib/term-exam-marks"

// Legacy RptSummary/ResultAnalysis ("Subject Result Analysis"): pick an exam
// whose merit list is generated, optionally one section (?section=) and one
// subject (?subject=), and see how its students' marks spread over the
// letter grades, subject by subject.
export function ResultAnalysis() {
  const f = useExamReportFilter()
  const { institute, chosen, academicClass, branch } = f
  const students = useStudents()
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)

  const sectionOptions = f.examSections
  const section = sectionOptions.find((s) => String(s.id) === f.param("section"))
  const subjectId = chosen?.subjects.find((s) => String(s.subjectId) === f.param("subject"))?.subjectId

  const analysis =
    chosen && f.list ? resultAnalysis(chosen, students, marks, { sectionId: section?.id, subjectId }) : undefined
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectName = (id: number) => byId.get(id)?.name ?? name("subject", id)
  // The subject's short name, as the legacy column head.
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || subjectName(id)
  const heading = {
    class: academicClass?.name ?? "—",
    group: chosen?.groupId != null && academicClass?.hasSubjectGroup ? name("group", chosen.groupId) : undefined,
    section: section?.name ?? "All",
  }

  function exportCsv() {
    if (!chosen || !analysis) return
    const partKeys = ["theoryMarks", "cqMarks", "mcqMarks", "practicalMarks"] as const
    const rows = analysis.subjects.flatMap((s) => {
      const partCells = (cell: (p: (typeof s.parts)[number]) => (string | number)[]) =>
        partKeys.flatMap((key) => {
          const part = s.parts.find((p) => p.key === key)
          return part ? cell(part) : ["", ""]
        })
      return [
        ...analysis.grades.map((g, i) => [
          subjectName(s.subjectId),
          `${g.minMarks}-${g.maxMarks}%`,
          ...partCells((p) => [`${p.ranges[i].min}-${p.ranges[i].max}`, p.counts[i]]),
          `${s.summary.ranges[i].min}-${s.summary.ranges[i].max}`,
          g.name,
          s.summary.counts[i],
          analysisPercent(s.summary.counts[i], s.total),
        ]),
        [
          subjectName(s.subjectId),
          "Absent",
          ...partCells((p) => ["", p.absent]),
          "",
          "",
          s.summary.absent,
          analysisPercent(s.summary.absent, s.total),
        ],
        [
          subjectName(s.subjectId),
          "Total Student",
          ...partCells((p) => ["", p.counts.reduce((sum, n) => sum + n, 0) + p.absent]),
          "",
          "",
          s.total,
          "",
        ],
      ]
    })
    downloadCsv(
      `subject-result-analysis-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [
        "Subject",
        "Marks Range",
        ...["Theory", "CQ", "MCQ", "Practical"].flatMap((p) => [`${p} Range`, `${p} Students`]),
        "Total Range",
        "Letter Grade",
        "Students",
        "Percentage",
      ],
      rows
    )
  }

  const empty = analysis && !analysis.subjects.some((s) => s.total > 0)
  const sheet = chosen && analysis && institute && !empty && (
    <ResultAnalysisSheet
      institute={institute}
      branch={branch}
      exam={chosen}
      analysis={analysis}
      heading={heading}
      subjectName={subjectName}
      subjectLabel={subjectLabel}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Subject Result Analysis</CardTitle>
          <CardDescription>
            How many students scored within each letter grade&apos;s range, in every part of each subject,
            and how many were absent.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Section"
            value={section ? String(section.id) : ""}
            onChange={(v) => f.setParam({ section: v })}
            options={sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!chosen}
          />
          <FilterField
            label="Subject"
            value={subjectId != null ? String(subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v })}
            options={(chosen?.subjects ?? []).map((s) => ({
              value: String(s.subjectId),
              label: subjectName(s.subjectId),
            }))}
            allLabel="All subjects"
            disabled={!chosen}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Subject Result Analysis Report</CardTitle>
            <CardDescription>
              {analysis && chosen && !empty
                ? `${chosen.fullName} · ${heading.section === "All" ? "all sections" : heading.section} · ${analysis.subjects.length} subject${analysis.subjects.length === 1 ? "" : "s"}`
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
