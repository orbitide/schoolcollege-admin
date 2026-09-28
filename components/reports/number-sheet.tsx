"use client"

import { PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { NumberSheetSheet } from "@/components/reports/number-sheet-sheet"
import { PrintArea } from "@/components/reports/print-area"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import { useStudents } from "@/lib/students"
import { tabulation, tabulationParts } from "@/lib/tabulation"
import { useTermExamMarks } from "@/lib/term-exam-marks"

// Legacy RptResult/NumberSheet: pick an exam whose result is published
// online and merit list generated, then a section — and a roll, for one
// student — and print each student's marks card. Everything lives in the
// URL (?exam=&section=&roll=).
export function NumberSheet() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass, branch } = f
  const iid = institute?.id ?? -1
  const students = useStudents()
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const roll = f.param("roll")
  const byId = new Map(subjects.map((s) => [s.id, s]))
  // The subject's short name, as the legacy column heads.
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)

  // Legacy NumberSheetAjax's checks, in its words.
  const unpublished = chosen && !chosen.onlinePublished ? `${chosen.name} result isn't published to online` : null
  const sheetData =
    chosen && list && section && institute && !unpublished
      ? tabulation(chosen, list, {
          institute,
          students,
          marks,
          classYearSubjects,
          sectionId: section.id,
          exceptAllAbsent: false,
          displayGrace: false,
        })
      : undefined
  const rows = sheetData?.students.filter((s) => !roll || s.result.roll.trim() === roll)
  // Legacy GetHighestMark: the section's best total in the merit list.
  const highestMarks = Math.max(
    0,
    ...(list?.results.filter((r) => r.sectionId === section?.id).map((r) => r.totalMarks) ?? [])
  )
  const parts = tabulationParts
    .filter((p) => chosen?.subjects.some((s) => s[p.marks] > 0))
    .map((p) => p.key)

  const sheet = chosen && institute && rows && rows.length > 0 && (
    <NumberSheetSheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      exam={chosen}
      students={rows}
      parts={parts}
      highestMarks={highestMarks}
      name={name}
      subjectLabel={subjectLabel}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Number Sheet</CardTitle>
          <CardDescription>
            A marks card per student of a section: every part of every subject, total marks, the
            section&apos;s highest and their merit position.
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
          <Field>
            <FieldLabel htmlFor="number-sheet-roll">Roll</FieldLabel>
            <Input
              id="number-sheet-roll"
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
            <CardTitle>Number Sheet</CardTitle>
            <CardDescription>
              {sheet && section
                ? `${chosen.fullName} · ${section.name} · ${rows.length} student${rows.length === 1 ? "" : "s"}, two to a printed page`
                : "Only exams published online with a generated merit list can be reported."}
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
              <div className="mx-auto max-w-[64rem] min-w-[48rem]">{sheet}</div>
            </div>
          ) : chosen && list && (unpublished || !section) ? (
            <ExamReportEmpty filter={f} empty emptyMessage={unpublished ?? "Select a section"} />
          ) : (
            <ExamReportEmpty
              filter={f}
              empty={!!rows}
              emptyMessage={
                roll
                  ? `No student result found for Roll: ${roll}`
                  : `No student result found for Section: ${section?.name ?? ""}`
              }
            />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="356mm 216mm">{sheet}</PrintArea>}
    </div>
  )
}
