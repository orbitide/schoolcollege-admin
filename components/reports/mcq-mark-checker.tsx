"use client"

import { CheckIcon, PrinterIcon, XIcon } from "lucide-react"

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
import { subjectStore } from "@/lib/academic-store"
import type { AcademicClass, Institute, Section } from "@/lib/institutes"
import { mcqMarkChecker, type McqCheck, type McqQuestion } from "@/lib/mcq-mark-checker"
import { useStudents } from "@/lib/students"
import { useTermExamAnswers } from "@/lib/term-exam-answers"
import { useTermExamMarks } from "@/lib/term-exam-marks"
import { classYearExamSubjects, type TermExam, type TermExamSubject } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

const td = "border border-black px-1.5 py-1 text-center"

function QuestionTable({ questions, first }: { questions: McqQuestion[]; first: number }) {
  return (
    <table className="w-full border-collapse self-start">
      <thead>
        <tr>
          <th className={cn(td, "w-[16%]")}>SL</th>
          <th className={cn(td, "w-[28%]")}>Correct Answer</th>
          <th className={cn(td, "w-[28%]")}>Student Answer</th>
          <th className={cn(td, "w-[28%]")}>Marks</th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q, i) => (
          <tr key={i}>
            <td className={td}>{first + i + 1}</td>
            <td className={td}>{q.key || "-"}</td>
            <td className={td}>
              <span className="flex items-center justify-center gap-2">
                <span className="font-bold">{q.given || "-"}</span>
                {q.correct ? (
                  <CheckIcon className="size-4 text-green-700" aria-label="correct" />
                ) : (
                  <XIcon className="size-4 text-red-600" aria-label="wrong" />
                )}
              </span>
            </td>
            <td className={td}>{q.marks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Legacy Partial/_mcqMarkChecker: a page per student — the institute
// heading, exam, subject and set, the student's class details, full, pass
// and obtained MCQ marks with the correct / wrong / unanswered counts, then
// the questions in two halves: the key, the student's answer (ticked or
// crossed) and the marks it earned.
function McqMarkCheckerSheet({
  institute,
  exam,
  subject,
  subjectName,
  academicClass,
  section,
  checks,
  name,
}: {
  institute: Institute
  exam: TermExam
  subject: TermExamSubject
  subjectName: string
  academicClass?: AcademicClass
  section: Section
  checks: McqCheck[]
  name: (kind: "group", id: number | null) => string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const rollColor = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const box = "border border-black px-2.5 py-1.5"

  return (
    <div className="flex flex-col gap-10 bg-white font-serif text-sm text-black">
      {checks.map(({ student, enrolment: e, mark, questions }) => {
        const half = Math.ceil(questions.length / 2)
        const obtained = mark.mcqMarks ?? 0
        return (
          <section key={student.id} className="flex break-after-page flex-col gap-3 last:break-after-auto">
            <header className="flex items-center justify-center gap-5">
              <div style={{ width: logoWidth }} className="shrink-0">
                {institute.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institute.logoUrl} alt="" className="h-auto w-full" />
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
                <p>{institute.address}</p>
                <h2 style={parseInlineStyle(config.reportNameStyle)}>MCQ Marks Checker</h2>
              </div>
              <div style={{ width: logoWidth }} className="shrink-0" />
            </header>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {(
                [
                  ["Exam", exam.name],
                  ["Subject", subjectName],
                  ["Set", mark.setCode || "-"],
                ] as const
              ).map(([label, value]) => (
                <p key={label} className={box}>
                  {label} :{" "}
                  <strong className="text-base whitespace-nowrap" style={{ color: highlight }}>
                    {value}
                  </strong>
                </p>
              ))}
            </div>

            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className={cn(td, "w-[10%] text-left")}>Class :</td>
                  <td className={cn(td, "w-[10%]")} style={{ color: highlight }}>
                    {academicClass?.name ?? "—"}
                  </td>
                  <td className={cn(td, "w-[18%] text-right")}>Section :</td>
                  <td className={cn(td, "w-[22%]")} style={{ color: highlight }}>
                    {section.name}
                  </td>
                  <td className={cn(td, "w-[20%] text-right")}>Roll :</td>
                  <td className={cn(td, "text-lg font-bold tracking-[3px]")} style={{ color: rollColor }}>
                    {e.classRoll}
                  </td>
                </tr>
                <tr>
                  <td className={cn(td, "text-left")}>Group :</td>
                  <td className={cn(td, "whitespace-nowrap")} style={{ color: highlight }}>
                    {e.groupId != null ? name("group", e.groupId) : "All"}
                  </td>
                  <td className={cn(td, "text-right")}>Version :</td>
                  <td className={td} style={{ color: highlight }}>
                    {e.version || "All"}
                  </td>
                  <td className={cn(td, "text-right")}>Type :</td>
                  <td className={td} style={{ color: highlight }}>
                    {e.studentType}
                  </td>
                </tr>
                <tr>
                  <td className={cn(td, "text-left")} colSpan={2}>
                    Student Name :
                  </td>
                  <td className={cn(td, "text-left")} colSpan={4} style={{ color: highlight }}>
                    {student.name}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-col items-center gap-1">
              <p className="text-lg font-bold">
                Full Marks: <span style={{ color: highlight }}>{subject.mcqMarks}</span>
                {"  "}Pass Marks: <span style={{ color: highlight }}>{subject.mcqPassMarks}</span>
                {"  "}Obtained Marks:{" "}
                <span className={obtained >= subject.mcqPassMarks ? "text-green-800" : "text-red-600"}>{obtained}</span>
              </p>
              <p className="italic">
                (Correct: <strong style={{ color: highlight }}>{mark.mcqCorrectAnswer ?? 0}</strong>, Wrong:{" "}
                <strong style={{ color: highlight }}>{mark.mcqWrongAnswer ?? 0}</strong>, Not Answered:{" "}
                <strong style={{ color: highlight }}>{mark.mcqNotAnswer ?? 0}</strong>
                {mark.mcqGraceMarks !== 0 && (
                  <>
                    , Grace: <strong className="text-red-600">{mark.mcqGraceMarks}</strong>
                  </>
                )}
                )
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <QuestionTable questions={questions.slice(0, half)} first={0} />
              <QuestionTable questions={questions.slice(half)} first={half} />
            </div>
          </section>
        )
      })}
    </div>
  )
}

// Legacy RptResult/McqMarkChecker: pick an exam, a section and one of its
// MCQ subjects — and a roll, for one student — and print each student's
// answer sheet checked against their set's answer key. Everything lives in
// the URL.
export function McqMarkChecker() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, academicClass } = f
  const students = useStudents()
  const marks = useTermExamMarks()
  const answers = useTermExamAnswers()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  // Legacy LoadTermExamSubjectByPracticalMcq(withMcq): the exam's subjects with MCQ marks.
  const mcq = (chosen?.subjects ?? []).filter((s) => s.mcqMarks > 0)
  const subject = mcq.find((s) => String(s.subjectId) === f.param("subject"))
  const roll = f.param("roll")
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectName = (id: number) => byId.get(id)?.name ?? name("subject", id)

  const perCorrect =
    (chosen &&
      subject &&
      classYearExamSubjects(chosen.instituteId, chosen.classId, chosen.yearId, chosen.medium, chosen.groupId).find(
        (x) => x.subject.subjectId === subject.subjectId
      )?.perMcq) ||
    1
  const result =
    chosen && section && subject
      ? mcqMarkChecker(chosen, subject, { students, marks, answers, sectionId: section.id, roll, perCorrect })
      : undefined
  const checks = result?.checks
  const pageSize = subject && subject.mcqMarks > 80 ? "216mm 356mm" : "210mm 297mm"

  const sheet = institute && chosen && section && subject && checks && checks.length > 0 && (
    <McqMarkCheckerSheet
      institute={institute}
      exam={chosen}
      subject={subject}
      subjectName={subjectName(subject.subjectId)}
      academicClass={academicClass}
      section={section}
      checks={checks}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">MCQ Mark Checker</CardTitle>
          <CardDescription>
            Each student&apos;s MCQ answer sheet checked question by question against their set&apos;s
            answer key.
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
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v })}
            options={mcq.map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder={chosen && !mcq.length ? "No MCQ subject" : "Select subject"}
            disabled={!mcq.length}
          />
          <Field>
            <FieldLabel htmlFor="mcq-roll">{classRollLabel(institute)}</FieldLabel>
            <Input
              id="mcq-roll"
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
            <CardTitle>MCQ Marks Checker</CardTitle>
            <CardDescription>
              {sheet
                ? `${chosen.fullName} · ${section.name} · ${subjectName(subject.subjectId)} · ${checks.length} student${checks.length === 1 ? "" : "s"}, a page each${result.withoutSheet ? ` · ${result.withoutSheet} uploaded without an answer sheet, not shown` : ""}`
                : "Pick an exam, a section and an MCQ subject."}
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
              <div className="mx-auto max-w-[52rem] min-w-[40rem]">{sheet}</div>
            </div>
          ) : chosen && !(section && subject) ? (
            <ExamReportEmpty
              filter={f}
              empty
              emptyMessage={
                !mcq.length ? `${chosen.name} has no subject with MCQ marks` : !section ? "Select a section" : "Select a subject"
              }
            />
          ) : (
            <ExamReportEmpty
              filter={f}
              empty={!!checks}
              emptyMessage={
                result?.withoutSheet
                  ? `No answer sheet found: ${result.withoutSheet} student${result.withoutSheet === 1 ? "'s" : "s'"} marks were uploaded without one`
                  : "No Student Found"
              }
            />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize={pageSize}>{sheet}</PrintArea>}
    </div>
  )
}
