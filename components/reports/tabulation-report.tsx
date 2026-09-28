"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { TabulationSheet } from "@/components/reports/tabulation-sheet"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import { sectionTeachers } from "@/lib/section-teachers"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"
import { DEFAULT_STUDENTS_PER_PAGE, tabulation, tabulationParts } from "@/lib/tabulation"
import { useTeachers } from "@/lib/teachers"
import { useTermExamMarks } from "@/lib/term-exam-marks"

// Legacy RptResult/Tabulation ("Tabulation"): pick an exam whose merit list
// is generated and one of its sections, and see every student's marks part
// by part, page by page. Everything lives in the URL (?exam=&section= opens
// a sheet directly, as the legacy termExamId and sectionId do).
export function TabulationReport() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass, branch } = f
  const iid = institute?.id ?? -1
  const students = useStudents()
  const marks = useTermExamMarks()
  const teachers = useTeachers()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const exceptAllAbsent = f.param("absent") === "except"
  const displayGrace = f.param("grace") === "show"
  const perPageParam = Number.parseInt(f.param("rows"), 10)
  const studentsPerPage = perPageParam > 0 ? perPageParam : DEFAULT_STUDENTS_PER_PAGE

  const byId = new Map(subjects.map((s) => [s.id, s]))
  // The subject's short name, as the legacy column heads.
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)
  const sheetData =
    chosen && list && section && institute
      ? tabulation(chosen, list, {
          institute,
          students,
          marks,
          classYearSubjects,
          sectionId: section.id,
          exceptAllAbsent,
          displayGrace,
        })
      : undefined
  // Legacy: the first teacher taking the section in the exam's year.
  const teacher = section && chosen ? sectionTeachers(teachers, section.id, chosen.yearId)[0] : undefined
  const groupName = section?.groupId != null ? name("group", section.groupId) : undefined

  function exportCsv() {
    if (!chosen || !sheetData || !section) return
    // A column per part the exam marks each subject in, then its total.
    const columns = chosen.subjects
      .filter((s) => sheetData.students.some((std) => std.subjects.some((sub) => sub.subjectId === s.subjectId)))
      .flatMap((s) => [
        ...tabulationParts
          .filter((p) => s[p.marks] > 0)
          .map((p) => ({ subjectId: s.subjectId, part: p.key, head: `${subjectLabel(s.subjectId)} ${p.label}` })),
        { subjectId: s.subjectId, part: null, head: `${subjectLabel(s.subjectId)} Total` },
      ])
    const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    downloadCsv(
      `tabulation-${slug(chosen.fullName)}-${slug(section.name)}.csv`,
      [
        "Sl",
        "Roll",
        "Student Name",
        "Previous GPA",
        ...columns.map((c) => c.head),
        "Result",
        "Total Marks",
        "Position in Section",
        "Failed Subjects",
      ],
      sheetData.students.map((std, i) => [
        i + 1,
        std.result.roll,
        std.student.name,
        std.previousGpa,
        ...columns.map((c) => {
          const sub = std.subjects.find((s) => s.subjectId === c.subjectId)
          if (!sub) return ""
          return (c.part ? sub.parts[c.part]?.text : sub.total.text) ?? "-"
        }),
        std.resultText,
        std.result.totalMarks,
        std.passed ? std.result.sectionPosition : "",
        std.result.failedSubjectCount,
      ])
    )
  }

  const empty = sheetData && !sheetData.students.length
  const sheet = chosen && sheetData && institute && section && !empty && (
    <TabulationSheet
      institute={institute}
      branch={branch}
      academicClass={academicClass}
      section={section}
      exam={chosen}
      tabulation={sheetData}
      studentsPerPage={studentsPerPage}
      teacher={teacher}
      groupName={groupName}
      subjectLabel={subjectLabel}
    />
  )
  const total = sheetData?.students.length ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Tabulation Sheet</CardTitle>
          <CardDescription>
            A section&apos;s students with their marks in every part of every subject, their
            result and position in the section.
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
            <FieldLabel htmlFor="students-per-page">Students per page</FieldLabel>
            <Input
              id="students-per-page"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={String(DEFAULT_STUDENTS_PER_PAGE)}
              value={f.param("rows")}
              onChange={(e) => f.setParam({ rows: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-2 sm:col-span-2 lg:col-span-3">
            <Field orientation="horizontal" className="w-auto">
              <Checkbox
                id="except-all-absent"
                checked={exceptAllAbsent}
                onCheckedChange={(checked) => f.setParam({ absent: checked === true ? "except" : "" })}
              />
              <FieldLabel htmlFor="except-all-absent">Except all absent</FieldLabel>
            </Field>
            <Field orientation="horizontal" className="w-auto">
              <Checkbox
                id="display-grace-marks"
                checked={displayGrace}
                onCheckedChange={(checked) => f.setParam({ grace: checked === true ? "show" : "" })}
              />
              <FieldLabel htmlFor="display-grace-marks">Display grace marks</FieldLabel>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Tabulation Sheet</CardTitle>
            <CardDescription>
              {sheet && chosen && section
                ? `${chosen.fullName} · ${section.name} · ${total} student${total === 1 ? "" : "s"}, ${sheetData.passed} passed`
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
              <div className="min-w-[64rem]">{sheet}</div>
            </div>
          ) : chosen && list && !section ? (
            <ExamReportEmpty filter={f} empty emptyMessage="Choose a Section" />
          ) : (
            <ExamReportEmpty filter={f} empty={!!empty} emptyMessage="No student found" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="356mm 216mm">{sheet}</PrintArea>}
    </div>
  )
}
