"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, CopyIcon, PencilIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { useStudentLookups } from "@/components/students/student-lookups"
import { examDate } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { subjectStore } from "@/lib/academic-store"
import { useInstitute } from "@/lib/institutes-store"
import { examMarkParts, useTermExam, useTermExams } from "@/lib/term-exams"

// Legacy TermExam Details: everything set on the exam and its subjects.
export function TermExamDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const exam = useTermExam(id)
  const exams = useTermExams()
  const institute = useInstitute(exam?.instituteId ?? -1)
  const subjects = subjectStore.useAll()
  const name = useStudentLookups()
  const listHref = returnTo?.startsWith("/") ? returnTo : "/term-exam"

  if (!exam || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Term exam not found</h2>
        <p className="text-sm text-muted-foreground">It may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to term exams</Link>
        </Button>
      </div>
    )
  }

  const examName = (examId: number | null) =>
    examId == null ? "—" : (exams.find((e) => e.id === examId)?.fullName ?? "—")
  const subjectName = new Map(subjects.map((s) => [s.id, `${s.name} (${s.code})`]))
  const yesNo = (value: boolean) => (value ? "Yes" : "No")
  const back = `returnTo=${encodeURIComponent(listHref)}`
  const deleted = exam.status === "Deleted"

  const rows: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ...(institute.enableMedium ? [["Medium", exam.medium || "—"] as [string, string]] : []),
    ["Class", name("class", exam.classId)],
    ["Academic year", name("year", exam.yearId)],
    ...(exam.groupId != null || institute.enableGroup
      ? [["Academic group", exam.groupId == null ? "All groups" : name("group", exam.groupId)] as [string, string]]
      : []),
    ...(institute.enableBranch
      ? [["Branch", exam.branchId == null ? "All branches" : name("branch", exam.branchId)] as [string, string]]
      : []),
    ...(institute.enableVersion ? [["Version", exam.version || "All versions"] as [string, string]] : []),
    ...(institute.enableShift
      ? [["Shift", exam.shiftId == null ? "All shifts" : name("shift", exam.shiftId)] as [string, string]]
      : []),
    ["Parent term exam", examName(exam.parentExamId)],
    ["Exam date", `${examDate(exam.examStart)} to ${examDate(exam.examEnd)}`],
    ["Result publish", examDate(exam.resultPublish)],
    ["Total working days", exam.totalWorkingDays],
    ["Attendance marks", exam.hasAttendanceMarks ? exam.attendanceMarks : "No"],
    ["Assignment marks", exam.hasAssignmentMarks ? exam.assignmentMarks : "No"],
    ["Calculate GPA", yesNo(exam.calculateGpa)],
    ["Edit enable", yesNo(exam.editEnable)],
    ["Show in year book", yesNo(exam.showInYearBook)],
    ["Online published", yesNo(exam.onlinePublished)],
    ["Multi paper calculation", yesNo(exam.multiPaperCalculation)],
    ["Has grace marks", yesNo(exam.hasGraceMarks)],
    ["Parent exam without optional", yesNo(exam.parentExamWithoutOptional)],
    [
      "Dependent exams",
      exam.dependentExamIds.length
        ? exam.dependentExamIds.map(examName).join(", ")
        : "—",
    ],
    ["Created", `${exam.createdBy}, ${new Date(exam.createdAt).toLocaleString("en-GB")}`],
    ["Last modified", `${exam.modifiedBy}, ${new Date(exam.modifiedAt).toLocaleString("en-GB")}`],
  ]

  const sum = (key: "totalMarks" | "totalPassMarks") =>
    exam.subjects.reduce((total, s) => total + s[key], 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Term exams
          </Link>
        </Button>
        {!deleted && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/term-exam/new?copy=${exam.id}&${back}`}>
                <CopyIcon data-icon="inline-start" />
                Copy
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/term-exam/${exam.id}/edit?${back}`}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{exam.name}</CardTitle>
            <StatusBadge status={exam.status} />
            {exam.onlinePublished && <Badge>Published online</Badge>}
          </div>
          <CardDescription>{exam.fullName}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[11rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exam subjects</CardTitle>
          <CardDescription>
            {exam.subjects.length} subject{exam.subjects.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead rowSpan={2} className="w-12">
                    Sl
                  </TableHead>
                  <TableHead rowSpan={2}>Subject</TableHead>
                  {examMarkParts.map((part) => (
                    <TableHead key={part.label} colSpan={2} className="border-l text-center">
                      {part.label}
                    </TableHead>
                  ))}
                  <TableHead colSpan={2} className="border-l text-center">
                    Total
                  </TableHead>
                </TableRow>
                <TableRow>
                  {[...examMarkParts.map((p) => p.label), "Total"].map((label) => (
                    <React.Fragment key={label}>
                      <TableHead className="border-l text-center text-xs font-normal">Marks</TableHead>
                      <TableHead className="text-center text-xs font-normal">Pass</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exam.subjects.map((subject, index) => (
                  <TableRow key={subject.subjectId}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {subjectName.get(subject.subjectId) ?? `Subject #${subject.subjectId}`}
                    </TableCell>
                    {examMarkParts.map((part) => (
                      <React.Fragment key={part.label}>
                        <TableCell className="border-l text-center tabular-nums">
                          {subject[part.marks] || "—"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {subject[part.marks] ? subject[part.pass] : "—"}
                        </TableCell>
                      </React.Fragment>
                    ))}
                    <TableCell className="border-l text-center font-semibold tabular-nums">
                      {subject.totalMarks}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{subject.totalPassMarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {exam.subjects.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2 + examMarkParts.length * 2} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="border-l text-center tabular-nums">{sum("totalMarks")}</TableCell>
                    <TableCell className="text-center tabular-nums">{sum("totalPassMarks")}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
