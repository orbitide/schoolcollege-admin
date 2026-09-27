"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { useStudentLookups } from "@/components/students/student-lookups"
import { markEditHref } from "@/components/term-exam-marks/mark-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { subjectStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { useStudents } from "@/lib/students"
import { useTermExamMark } from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const show = (value: number | null | undefined) => (value == null ? "—" : value)
const date = (iso: string) => new Date(iso).toLocaleString("en-GB")
const day = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "—")

// Legacy TermExamStudentMarks Details: one student's marks in one subject
// of a term exam, next to what the exam subject is marked out of.
export function MarkDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const institutes = useAccessibleInstitutes()
  const mark = useTermExamMark(id)
  const exams = useTermExams()
  const students = useStudents()
  const subjects = subjectStore.useAll()
  const name = useStudentLookups()
  const listHref = returnTo?.startsWith("/") ? returnTo : "/term-exam-marks"

  const exam = exams.find((e) => e.id === mark?.termExamId)
  const institute = institutes.find((i) => i.id === exam?.instituteId)

  if (!mark || !exam || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Marks not found</h2>
        <p className="text-sm text-muted-foreground">They may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to student marks</Link>
        </Button>
      </div>
    )
  }

  const student = students.find((s) => s.id === mark.studentId)
  const enrolment = student?.enrolments.find((en) => en.classId === exam.classId && en.yearId === exam.yearId)
  const subject = subjects.find((s) => s.id === mark.subjectId)
  const es = exam.subjects.find((s) => s.subjectId === mark.subjectId)
  const deleted = mark.status === "Deleted"

  const info: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ...(institute.enableMedium ? ([["Medium", exam.medium || "All mediums"]] as [string, React.ReactNode][]) : []),
    ["Class", name("class", exam.classId)],
    ["Academic year", name("year", exam.yearId)],
    ...(institute.enableGroup && enrolment?.groupId != null
      ? ([["Academic group", name("group", enrolment.groupId)]] as [string, React.ReactNode][])
      : []),
    ...(institute.enableBranch ? ([["Branch", name("branch", enrolment?.branchId)]] as [string, React.ReactNode][]) : []),
    ...(institute.enableVersion ? ([["Version", enrolment?.version || "—"]] as [string, React.ReactNode][]) : []),
    ...(institute.enableShift ? ([["Shift", name("shift", enrolment?.shiftId)]] as [string, React.ReactNode][]) : []),
    ["Student", student ? <Link href={`/students/${student.id}`} className="hover:underline">{student.name}</Link> : "—"],
    ["Roll", mark.roll],
    ["Section", name("section", enrolment?.sectionId)],
    ["Exam", exam.fullName],
    ["Exam start – end", `${day(exam.examStart)} – ${day(exam.examEnd)}`],
    ["Result publish", day(exam.resultPublish)],
    ["Subject", subject ? `${subject.name}${subject.code ? ` (${subject.code})` : ""}` : name("subject", mark.subjectId)],
    ["Subject type", mark.isOptional ? "Optional" : "Compulsory"],
    [
      "Result status",
      mark.isPassCalculated ? (
        <span className={cn(!mark.isPass && "text-destructive")}>{mark.isPass ? "Passed" : "Failed"}</span>
      ) : (
        "Not calculated — run Pass Fail ReGenerate"
      ),
    ],
    ["Letter grade", mark.letterGrade || "—"],
    ["GPA", mark.isPassCalculated ? mark.gpa : "—"],
    ["Final GPA", mark.isPassCalculated ? mark.finalGpa : "—"],
    ["Created", `${mark.createdBy}, ${date(mark.createdAt)}`],
    ["Last modified", `${mark.modifiedBy}, ${date(mark.modifiedAt)}`],
  ]

  const parts = [
    { label: "Theory", full: es?.theoryMarks ?? 0, pass: es?.theoryPassMarks ?? 0, obtained: mark.theoryMarks, grace: mark.theoryGraceMarks },
    { label: "CQ", full: es?.cqMarks ?? 0, pass: es?.cqPassMarks ?? 0, obtained: mark.cqMarks, grace: mark.cqGraceMarks },
    { label: "MCQ", full: es?.mcqMarks ?? 0, pass: es?.mcqPassMarks ?? 0, obtained: mark.mcqMarks, grace: mark.mcqGraceMarks },
    { label: "Practical", full: es?.practicalMarks ?? 0, pass: es?.practicalPassMarks ?? 0, obtained: mark.practicalMarks, grace: 0 },
  ].filter((p) => p.full > 0 || p.obtained != null)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Student marks
          </Link>
        </Button>
        {!deleted && (
          <Button asChild variant="outline" size="sm">
            <Link href={markEditHref(mark, exam, `/term-exam-marks/${mark.id}?returnTo=${encodeURIComponent(listHref)}`)}>
              <PencilIcon data-icon="inline-start" />
              Edit student marks
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">
              {student?.name ?? `Roll ${mark.roll}`} · {subject?.name ?? name("subject", mark.subjectId)}
            </CardTitle>
            <StatusBadge status={mark.status} />
          </div>
          <CardDescription>{exam.fullName}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {info.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marks</CardTitle>
          <CardDescription>What the student got against the exam subject&apos;s marks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-center">Full marks</TableHead>
                  <TableHead className="text-center">Pass marks</TableHead>
                  <TableHead className="text-center">Obtained</TableHead>
                  <TableHead className="text-center">Grace</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => {
                  const total = p.obtained == null && !p.grace ? null : (p.obtained ?? 0) + p.grace
                  return (
                    <TableRow key={p.label}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-center tabular-nums">{p.full || "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{p.pass || "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{show(p.obtained)}</TableCell>
                      <TableCell className="text-center tabular-nums">{p.label === "Practical" ? "—" : p.grace}</TableCell>
                      <TableCell
                        className={cn("text-center font-medium tabular-nums", total != null && total < p.pass && "text-destructive")}
                      >
                        {show(total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {exam.hasAssignmentMarks && (
                  <TableRow>
                    <TableCell className="font-medium">Assignment</TableCell>
                    <TableCell className="text-center tabular-nums">{exam.assignmentMarks}</TableCell>
                    <TableCell className="text-center">—</TableCell>
                    <TableCell className="text-center tabular-nums">{show(mark.assignmentMarks)}</TableCell>
                    <TableCell className="text-center">—</TableCell>
                    <TableCell className="text-center font-medium tabular-nums">{show(mark.assignmentMarks)}</TableCell>
                  </TableRow>
                )}
                {exam.hasAttendanceMarks && (
                  <TableRow>
                    <TableCell className="font-medium">Attendance</TableCell>
                    <TableCell className="text-center tabular-nums">{exam.attendanceMarks}</TableCell>
                    <TableCell className="text-center">—</TableCell>
                    <TableCell className="text-center tabular-nums">{show(mark.attendanceMarks)}</TableCell>
                    <TableCell className="text-center">—</TableCell>
                    <TableCell className="text-center font-medium tabular-nums">{show(mark.attendanceMarks)}</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-muted/40">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-center tabular-nums">{es?.totalMarks ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums">{es?.totalPassMarks ?? "—"}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell
                    className={cn(
                      "text-center font-semibold tabular-nums",
                      es && mark.totalMarks < es.totalPassMarks && "text-destructive"
                    )}
                  >
                    {mark.totalMarks}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {(mark.mcqAnswer || mark.setCode || mark.mcqCorrectAnswer != null) && (
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {(
                [
                  ["Set code", mark.setCode || "—"],
                  ["Correct answer", show(mark.mcqCorrectAnswer)],
                  ["Wrong answer", show(mark.mcqWrongAnswer)],
                  ["Not answered", show(mark.mcqNotAnswer)],
                  ["Examiner code", mark.examinerCode || "—"],
                ] as [string, React.ReactNode][]
              ).map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              {mark.mcqAnswer && (
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-muted-foreground">MCQ answer</dt>
                  <dd className="font-mono text-xs break-all">{mark.mcqAnswer}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
