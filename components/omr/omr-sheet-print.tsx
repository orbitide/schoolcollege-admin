"use client"

import * as React from "react"
import { CircleAlertIcon, PrinterIcon, TriangleAlertIcon } from "lucide-react"

import { OmrSheet, type OmrSheetInfo } from "@/components/omr/omr-sheet"
import { ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { classStore, subjectStore } from "@/lib/academic-store"
import { omrLayout, ROLL_DIGITS } from "@/lib/omr-template"
import { mcqQuestionCount, useGeneratedPapers } from "@/lib/question-papers"
import { useStudents } from "@/lib/students"
import { examStudents, takesSubject } from "@/lib/term-exam-marks"

const MAX_BLANK = 200

// Term Exam › OMR Sheet: A4 MCQ answer sheets for an exam subject, in the
// layout OMR Scan reads. Blank ones to hand out, or one per student of a
// section with the name and roll printed (and the roll bubbles filled, so
// only the set and the answers are left). Prints from this tab.
export function OmrSheetPrint() {
  const f = useExamReportFilter({ meritList: false })
  const exam = f.chosen
  const subjects = subjectStore.useAll()
  const classes = classStore.useAll()
  const students = useStudents()
  const papers = useGeneratedPapers()
  const mcqSubjects = (exam?.subjects ?? []).filter((s) => s.mcqMarks > 0)
  const subjectRow = mcqSubjects.find((s) => String(s.subjectId) === f.param("subject"))
  const subject = subjectRow && subjects.find((s) => s.id === subjectRow.subjectId)
  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const mode = f.param("mode") === "blank" ? "blank" : "students"
  const lang = f.param("lang") === "en" ? "en" : "bn"
  const [copies, setCopies] = React.useState(40)
  const [prefill, setPrefill] = React.useState(true)

  const questions = exam && subjectRow ? mcqQuestionCount(exam, subjectRow.subjectId, papers) : 0
  const layout = omrLayout(questions || 1)
  const candidates =
    exam && subjectRow
      ? examStudents(exam, students)
          .filter(
            ({ enrolment }) =>
              (!section || enrolment.sectionId === section.id) && takesSubject(enrolment, subjectRow.subjectId)
          )
          .sort((a, b) => Number(a.enrolment.classRoll) - Number(b.enrolment.classRoll) || a.enrolment.classRoll.localeCompare(b.enrolment.classRoll))
      : []
  const longRolls = candidates.filter((c) => c.enrolment.classRoll.trim().length > ROLL_DIGITS).length

  const base: Omit<OmrSheetInfo, "student"> | null =
    exam && subject
      ? {
          institute: f.institute?.name ?? "",
          exam: exam.fullName,
          subject: `${(lang === "bn" && subject.nameBn) || subject.name}${subject.code ? ` (${subject.code})` : ""}`,
          lang,
        }
      : null
  const sheets: OmrSheetInfo[] = base
    ? mode === "blank"
      ? Array.from({ length: Math.min(MAX_BLANK, Math.max(1, copies)) }, () => base)
      : candidates.map(({ student, enrolment }) => ({
          ...base,
          prefillRoll: prefill,
          student: {
            name: student.name,
            roll: enrolment.classRoll.trim(),
            className: classes.find((c) => c.id === enrolment.classId)?.name ?? "",
            section: f.sections.find((s) => s.id === enrolment.sectionId)?.name ?? "",
          },
        }))
    : []
  const ready = sheets.length > 0 && questions > 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">OMR Sheet</CardTitle>
            <CardDescription>
              MCQ answer sheets that OMR Scan can read. Print at 100% (actual size) on A4; don&apos;t fit to page.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => window.print()} disabled={!ready}>
            <PrinterIcon data-icon="inline-start" />
            Print {ready ? sheets.length : ""} sheet{sheets.length === 1 ? "" : "s"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subjectRow ? String(subjectRow.subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v })}
            options={mcqSubjects.map((s) => ({
              value: String(s.subjectId),
              label: subjects.find((x) => x.id === s.subjectId)?.name ?? `Subject ${s.subjectId}`,
            }))}
            placeholder={exam && !mcqSubjects.length ? "No MCQ subject" : "Select subject"}
            disabled={!exam}
          />
          <FilterField
            label="Sheets"
            value={mode}
            onChange={(v) => f.setParam({ mode: v })}
            options={[
              { value: "students", label: "One per student" },
              { value: "blank", label: "Blank" },
            ]}
          />
          {mode === "students" ? (
            <FilterField
              label="Section"
              value={section ? String(section.id) : ""}
              onChange={(v) => f.setParam({ section: v })}
              options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All sections"
              disabled={!exam}
            />
          ) : (
            <Field>
              <FieldLabel htmlFor="copies">Copies</FieldLabel>
              <Input
                id="copies"
                type="number"
                min={1}
                max={MAX_BLANK}
                value={copies}
                onChange={(e) => setCopies(Math.floor(Number(e.target.value)) || 1)}
              />
            </Field>
          )}
          <FilterField
            label="Bubble letters"
            value={lang}
            onChange={(v) => f.setParam({ lang: v })}
            options={[
              { value: "bn", label: "বাংলা (ক খ গ ঘ)" },
              { value: "en", label: "English (A B C D)" },
            ]}
          />
          {mode === "students" && (
            <Label className="flex items-center gap-2 self-end pb-2 font-normal">
              <Checkbox checked={prefill} onCheckedChange={(on) => setPrefill(on === true)} />
              Fill in the roll bubbles
            </Label>
          )}
        </CardContent>
      </Card>

      {!exam || !subjectRow ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          Select the exam and an MCQ subject.
        </p>
      ) : !ready ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          No student of this exam takes the subject{section ? ` in ${section.name}` : ""}.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              {questions} questions · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
              {sheets.length > 1 && " · the first one is shown"}
            </span>
            {longRolls > 0 && (
              <span className="flex items-center gap-2 text-amber-600">
                <TriangleAlertIcon className="size-4 shrink-0" />
                {longRolls} roll{longRolls === 1 ? " is" : "s are"} longer than {ROLL_DIGITS} digits and can&apos;t be bubbled.
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border bg-neutral-100 p-4 dark:bg-neutral-900">
            <div className="mx-auto w-fit shadow-sm">
              <OmrSheet layout={layout} info={sheets[0]} />
            </div>
          </div>
          <PrintArea pageSize="210mm 297mm" margin="0">
            {sheets.map((info, i) => (
              <div key={i} style={{ breakAfter: i < sheets.length - 1 ? "page" : "auto", width: "210mm", height: "297mm", overflow: "hidden" }}>
                <OmrSheet layout={layout} info={info} />
              </div>
            ))}
          </PrintArea>
        </>
      )}
    </div>
  )
}
