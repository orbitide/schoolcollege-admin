"use client"

import { PrinterIcon } from "lucide-react"

import { AcademicTranscriptSheet } from "@/components/reports/academic-transcript-sheet"
import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { classRollLabel, useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import {
  matchesResultType,
  sectionHighest,
  transcriptResultTypes,
  type TranscriptResultType,
} from "@/lib/academic-transcript"
import { useStudents } from "@/lib/students"
import { tabulation } from "@/lib/tabulation"
import { getTermExamStudentInfo, useTermExamMarks } from "@/lib/term-exam-marks"

// Legacy RptResult/AcademicTranscript: pick an exam whose merit list is
// generated and a section — optionally a result type and a roll — and
// print each student's transcript. Everything lives in the URL.
export function AcademicTranscript() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass } = f
  const iid = institute?.id ?? -1
  const students = useStudents()
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const resultType: TranscriptResultType =
    transcriptResultTypes.find((t) => t.value === f.param("result"))?.value ?? "all"
  const roll = f.param("roll")
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectLabel = (id: number) => byId.get(id)?.name ?? name("subject", id)

  const rows =
    chosen && list && section && institute
      ? tabulation(chosen, list, {
          institute,
          students,
          marks,
          classYearSubjects,
          sectionId: section.id,
          exceptAllAbsent: false,
          displayGrace: false,
        }).students.filter((s) => matchesResultType(s, resultType) && (!roll || s.result.roll.trim() === roll))
      : undefined

  const sheet = chosen && list && section && institute && rows && rows.length > 0 && (
    <AcademicTranscriptSheet
      institute={institute}
      exam={chosen}
      academicClass={academicClass}
      section={section}
      students={rows}
      highest={sectionHighest(list, section.id)}
      info={(studentId) => getTermExamStudentInfo(chosen, studentId)}
      name={name}
      subjectLabel={subjectLabel}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Academic Transcript</CardTitle>
          <CardDescription>
            A mark sheet per student of a section: marks, grades, GPA, positions and attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => f.setParam({ section: v })}
            options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select section"
            disabled={!chosen}
          />
          <FilterField
            label="Result type"
            value={resultType}
            onChange={(v) => f.setParam({ result: v === "all" ? "" : v })}
            options={transcriptResultTypes.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Field>
            <FieldLabel htmlFor="transcript-roll">{classRollLabel(institute)}</FieldLabel>
            <Input
              id="transcript-roll"
              inputMode="numeric"
              placeholder="All students, or one roll"
              value={roll}
              onChange={(e) => f.setParam({ roll: e.target.value.trim() })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Academic Transcript</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${section.name} · ${rows.length} student${rows.length === 1 ? "" : "s"}, a page each`
                : "Only exams with a generated merit list can be reported."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[56rem] min-w-[44rem]">{sheet}</div>
            </div>
          ) : chosen && list && !section ? (
            <ExamReportEmpty filter={f} empty emptyMessage="Select a section" />
          ) : (
            <ExamReportEmpty filter={f} empty={!!rows} emptyMessage="No student found" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
