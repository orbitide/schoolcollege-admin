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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { classStore, subjectStore } from "@/lib/academic-store"
import {
  CUSTOM_LIMITS,
  omrLayout,
  omrType,
  omrTypes,
  specFor,
  specProblem,
  type OmrFields,
  type OmrTypeId,
} from "@/lib/omr-template"
import { mcqQuestionCount, paperFor, useGeneratedPapers } from "@/lib/question-papers"
import { useStudents, type Student } from "@/lib/students"
import { examStudents, takesSubject } from "@/lib/term-exam-marks"

const MAX_BLANK = 200

// A student's board registration number, most recent exam first.
function registrationOf(student: Student) {
  const results = Object.values(student.board ?? {}).filter((r) => r?.registrationNo)
  results.sort((a, b) => Number(b!.passingYear) - Number(a!.passingYear))
  return results[0]?.registrationNo ?? ""
}

// Term Exam › OMR Sheet: MCQ answer sheets for an exam subject, in any of
// the sheet types OMR Scan reads (Standard, Board Style, Class Test,
// Junior, Admission Test, or Custom fields). Blank ones to hand out, or one
// per student of a section with the name and roll printed (and the roll and
// registration bubbles filled, so only the set and the answers are left).
// Class Test sheets print two to an A4 page. Prints from this tab.
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
  const type = (omrTypes.find((t) => t.id === f.param("sheet"))?.id ?? "standard") as OmrTypeId
  const [copies, setCopies] = React.useState(40)
  const [prefill, setPrefill] = React.useState(true)
  const [custom, setCustom] = React.useState<OmrFields>({ ...omrType("custom").fields })

  const questions = exam && subjectRow ? mcqQuestionCount(exam, subjectRow.subjectId, papers) : 0
  const spec = specFor(type, questions || 1, custom)
  const problem = questions ? specProblem(spec) : null
  const layout = omrLayout(spec)
  const paper = exam && subjectRow ? paperFor(exam.id, subjectRow.subjectId, "MCQ", papers) : undefined
  const fiveOptions = !!paper?.questions.some((q) => q.items.some((i) => i.options.length > 4))
  const candidates =
    exam && subjectRow
      ? examStudents(exam, students)
          .filter(({ enrolment }) => (!section || enrolment.sectionId === section.id) && takesSubject(enrolment, subjectRow.subjectId))
          .sort(
            (a, b) =>
              Number(a.enrolment.classRoll) - Number(b.enrolment.classRoll) || a.enrolment.classRoll.localeCompare(b.enrolment.classRoll)
          )
      : []
  const longRolls = candidates.filter((c) => c.enrolment.classRoll.trim().length > spec.roll).length

  const base: Omit<OmrSheetInfo, "student"> | null =
    exam && subject
      ? {
          institute: f.institute?.name ?? "",
          exam: exam.fullName,
          subject: `${(lang === "bn" && subject.nameBn) || subject.name}${subject.code ? ` (${subject.code})` : ""}`,
          subjectCode: subject.code,
          lang,
        }
      : null
  const sheets: OmrSheetInfo[] = base
    ? mode === "blank"
      ? Array.from({ length: Math.min(MAX_BLANK, Math.max(1, copies)) }, () => base)
      : candidates.map(({ student, enrolment }) => ({
          ...base,
          prefill,
          student: {
            name: student.name,
            roll: enrolment.classRoll.trim(),
            registration: registrationOf(student),
            className: classes.find((c) => c.id === enrolment.classId)?.name ?? "",
            section: f.sections.find((s) => s.id === enrolment.sectionId)?.name ?? "",
          },
        }))
    : []
  const ready = sheets.length > 0 && questions > 0 && !problem
  // Class Test sheets go two to an A4 page, one above the other.
  const pages: OmrSheetInfo[][] = layout.half
    ? Array.from({ length: Math.ceil(sheets.length / 2) }, (_, i) => sheets.slice(i * 2, i * 2 + 2))
    : sheets.map((s) => [s])
  const setCustomField = <K extends keyof OmrFields>(key: K, value: OmrFields[K]) => setCustom((c) => ({ ...c, [key]: value }))
  const digitsInput = (key: "roll" | "registration" | "subject", label: string) => (
    <Field>
      <FieldLabel htmlFor={`custom-${key}`}>{label}</FieldLabel>
      <Input
        id={`custom-${key}`}
        type="number"
        min={CUSTOM_LIMITS[key].min}
        max={CUSTOM_LIMITS[key].max}
        value={custom[key]}
        onChange={(e) => setCustomField(key, Math.floor(Number(e.target.value)) || 0)}
      />
    </Field>
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">OMR Sheet</CardTitle>
            <CardDescription>
              MCQ answer sheets that OMR Scan reads; it tells the sheet types apart by the code squares along the top edge. Print at 100% (actual size) on A4; don&apos;t fit to page.
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
          <div className="flex flex-col gap-2">
            <FilterField
              label="Sheet type"
              value={type}
              onChange={(v) => f.setParam({ sheet: v === "standard" ? "" : v })}
              options={omrTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FieldDescription>{omrType(type).description}</FieldDescription>
          </div>
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
              Fill in the roll{spec.registration ? " and registration" : ""} bubbles
            </Label>
          )}
          {type === "custom" && (
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-5">
              {digitsInput("roll", `Roll digits (${CUSTOM_LIMITS.roll.min}–${CUSTOM_LIMITS.roll.max})`)}
              {digitsInput("registration", `Registration digits (0–${CUSTOM_LIMITS.registration.max})`)}
              {digitsInput("subject", `Subject code digits (0–${CUSTOM_LIMITS.subject.max})`)}
              <FilterField
                label="Options per question"
                value={String(custom.options)}
                onChange={(v) => setCustomField("options", v === "5" ? 5 : 4)}
                options={[
                  { value: "4", label: "4 (A–D)" },
                  { value: "5", label: "5 (A–E)" },
                ]}
              />
              <Label className="flex items-center gap-2 self-end pb-2 font-normal">
                <Checkbox checked={custom.set} onCheckedChange={(on) => setCustomField("set", on === true)} />
                Set code
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {!exam || !subjectRow ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          Select the exam and an MCQ subject.
        </p>
      ) : problem ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlertIcon className="size-4 shrink-0" />
          {problem}
        </p>
      ) : !sheets.length ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          No student of this exam takes the subject{section ? ` in ${section.name}` : ""}.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              {omrType(type).name} · {questions} questions · {spec.options} options · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
              {layout.half && ` on ${pages.length} A4 page${pages.length === 1 ? "" : "s"} (cut each in half)`}
              {sheets.length > 1 && " · the first one is shown"}
            </span>
            {fiveOptions && spec.options === 4 && (
              <span className="flex items-center gap-2 text-amber-600">
                <TriangleAlertIcon className="size-4 shrink-0" />
                The generated paper has questions with an option E; use Admission Test or Custom with 5 options.
              </span>
            )}
            {mode === "students" && longRolls > 0 && (
              <span className="flex items-center gap-2 text-amber-600">
                <TriangleAlertIcon className="size-4 shrink-0" />
                {longRolls} roll{longRolls === 1 ? " is" : "s are"} longer than {spec.roll} digits and can&apos;t be bubbled.
              </span>
            )}
            {!spec.set && paper && paper.sets.length > 1 && (
              <span className="flex items-center gap-2 text-amber-600">
                <TriangleAlertIcon className="size-4 shrink-0" />
                The paper has {paper.sets.length} sets but this sheet has no set code.
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border bg-neutral-100 p-4 dark:bg-neutral-900">
            <div className="mx-auto w-fit shadow-sm">
              <OmrSheet layout={layout} info={sheets[0]} />
            </div>
          </div>
          <PrintArea pageSize="210mm 297mm" margin="0">
            {pages.map((page, i) => (
              <div
                key={i}
                style={{ breakAfter: i < pages.length - 1 ? "page" : "auto", width: "210mm", height: "297mm", overflow: "hidden", position: "relative" }}
              >
                {page.map((info, k) => (
                  <OmrSheet key={k} layout={layout} info={info} />
                ))}
                {layout.half && (
                  <div
                    style={{ position: "absolute", left: 0, right: 0, top: "148.5mm", borderTop: "0.2mm dashed #999", height: 0 }}
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </PrintArea>
        </>
      )}
    </div>
  )
}
