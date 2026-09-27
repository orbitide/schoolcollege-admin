"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleCheckIcon, EyeIcon, RefreshCwIcon, TrophyIcon } from "lucide-react"
import { toast } from "sonner"

import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField, examDate } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { classStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import { generateMeritList, useMeritLists, type MeritList } from "@/lib/merit-lists"
import { useStudents } from "@/lib/students"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

// Legacy "Merit List Generation" (ResultCalculation/MeritListGenerate): the
// term exams of the chosen institute, class and year, each with a button to
// (re)generate its merit list.
export function MeritListGenerate() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const meritLists = useMeritLists()
  const user = useCurrentUser()
  const name = useStudentLookups()
  const canPick = institutes.length > 1
  const [viewing, setViewing] = React.useState<{ exam: TermExam; list: MeritList } | null>(null)

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)

  const allowed = new Map(institutes.map((i) => [i.id, i]))
  const rows = exams
    .filter(
      (exam) =>
        exam.status !== "Deleted" &&
        allowed.has(exam.instituteId) &&
        (!institute || exam.instituteId === institute.id) &&
        (!param("class") || String(exam.classId) === param("class")) &&
        (!param("year") || String(exam.yearId) === param("year"))
    )
    .sort((a, b) => a.instituteId - b.instituteId || a.rank - b.rank)
  const listFor = new Map(meritLists.map((l) => [l.termExamId, l]))

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  function generate(exam: TermExam) {
    try {
      const count = generateMeritList(exam, allowed.get(exam.instituteId)!, user.name)
      toast.success(`Merit list generated for ${count} students`, { description: exam.fullName })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The merit list could not be generated.")
    }
  }

  const showInstitute = !institute

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Merit List Generation</CardTitle>
          <CardDescription>
            Rechecks each student&apos;s pass status, works out GPA, grade and remarks, and ranks
            students within their group and section. Run it again after marks change.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, class: "", year: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v })}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {institute && (
            <FilterField
              label="Academic year"
              value={param("year")}
              onChange={(v) => setParam({ year: v })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              allLabel="All years"
            />
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {showInstitute && <TableHead>Institute</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Exam date</TableHead>
              <TableHead>Result publish</TableHead>
              <TableHead>Merit list</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((exam, index) => {
                const list = listFor.get(exam.id)
                return (
                  <TableRow key={exam.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {showInstitute && (
                      <TableCell>
                        {allowed.get(exam.instituteId)?.shortName || allowed.get(exam.instituteId)?.name}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">{name("class", exam.classId)}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{exam.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {examDate(exam.examStart)} – {examDate(exam.examEnd)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {examDate(exam.resultPublish)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {list ? (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <CircleCheckIcon className="size-4" />
                            Generated · {list.results.length} students
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {list.generatedBy}, {stamp(list.generatedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                          Not generated
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {list && (
                          <Button variant="outline" size="sm" onClick={() => setViewing({ exam, list })}>
                            <EyeIcon data-icon="inline-start" />
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={list ? "secondary" : "default"}
                          onClick={() => generate(exam)}
                        >
                          <RefreshCwIcon data-icon="inline-start" />
                          {list ? "Re-generate" : "Generate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={showInstitute ? 8 : 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No term exams match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Merit lists use the marks uploaded under Term Exam Marks; the seeded exams start with sample marks.
      </p>

      <MeritListDialog
        viewing={viewing}
        institute={viewing ? allowed.get(viewing.exam.instituteId) : undefined}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}

function MeritListDialog({
  viewing,
  institute,
  onClose,
}: {
  viewing: { exam: TermExam; list: MeritList } | null
  institute?: Institute
  onClose: () => void
}) {
  const students = useStudents()
  const name = useStudentLookups()
  const studentName = new Map(students.map((s) => [s.id, s.name]))
  const exam = viewing?.exam
  // Merit order first, then those without a position (failed or absent).
  const results = [...(viewing?.list.results ?? [])].sort(
    (a, b) =>
      (a.groupPosition || Infinity) - (b.groupPosition || Infinity) ||
      a.roll.localeCompare(b.roll, undefined, { numeric: true })
  )
  const grouped = results.some((r) => r.groupId != null) && institute?.enableGroup

  return (
    <Dialog open={!!viewing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_1fr] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-amber-500" />
            Merit list · {exam?.fullName}
          </DialogTitle>
          <DialogDescription>
            {exam && name("class", exam.classId)} · {results.length} students ·{" "}
            {results.filter((r) => r.groupPosition > 0).length} passed
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="text-center">{grouped ? "Group merit" : "Class merit"}</TableHead>
                <TableHead className="text-center">Section merit</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Section</TableHead>
                {grouped && <TableHead>Group</TableHead>}
                <TableHead className="text-right">Total</TableHead>
                {exam?.calculateGpa && <TableHead className="text-right">GPA</TableHead>}
                {exam?.calculateGpa && <TableHead>Grade</TableHead>}
                <TableHead className="text-center">Failed</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.studentId} className={cn(!r.groupPosition && "text-muted-foreground")}>
                  <TableCell className="text-center">
                    <Position value={r.groupPosition} />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{r.sectionPosition || "—"}</TableCell>
                  <TableCell className="tabular-nums">{r.roll}</TableCell>
                  <TableCell className="whitespace-nowrap">{studentName.get(r.studentId) ?? "—"}</TableCell>
                  <TableCell>{name("section", r.sectionId)}</TableCell>
                  {grouped && <TableCell>{name("group", r.groupId)}</TableCell>}
                  <TableCell className="text-right tabular-nums">{r.isPresent ? r.totalMarks : "—"}</TableCell>
                  {exam?.calculateGpa && (
                    <TableCell className="text-right tabular-nums">
                      {r.groupPosition ? r.gpa.toFixed(2) : "—"}
                    </TableCell>
                  )}
                  {exam?.calculateGpa && (
                    <TableCell>
                      {r.letterGrade}
                      {r.isGolden && <span className="ml-1 text-amber-500">★</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-center tabular-nums">
                    {r.isPresent ? r.failedSubjectCount : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.isPresent ? r.remarks || (r.failedSubjectCount ? "Failed" : "—") : "Absent"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const medal = [
  "bg-amber-400/25 text-amber-700 dark:text-amber-300",
  "bg-slate-400/25 text-slate-700 dark:text-slate-300",
  "bg-orange-400/25 text-orange-700 dark:text-orange-300",
]

function Position({ value }: { value: number }) {
  if (!value) return <span>—</span>
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        medal[value - 1] ?? "bg-muted"
      )}
    >
      {value}
    </span>
  )
}

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
