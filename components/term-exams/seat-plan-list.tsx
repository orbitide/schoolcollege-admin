"use client"

import * as React from "react"
import Link from "next/link"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { useStudentLookups } from "@/components/students/student-lookups"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { buildingStore, subjectStore } from "@/lib/academic-store"
import { deleteExamSeatPlan, useExamSeatPlans, type ExamSeatPlan } from "@/lib/exam-seat-plans"
import { useTermExams } from "@/lib/term-exams"

export const formatExamDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

// "10:00" → "10:00 AM".
export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  if (!Number.isFinite(h)) return hhmm
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

// Legacy ExamSeatPlan/ManageExamSeatPlan: the seat plans of the exams of a
// class and year (or one exam), with their subject, the part of the exam
// they cover, date and time and rooms, to edit or delete.
export function SeatPlanList() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen, filter } = f
  const plans = useExamSeatPlans()
  const exams = useTermExams()
  const name = useStudentLookups()
  const iid = institute?.id ?? -1
  const subjects = subjectStore.useList(iid)
  const buildings = buildingStore.useList(iid)
  const [deleting, setDeleting] = React.useState<ExamSeatPlan | null>(null)

  const examOf = new Map(exams.map((e) => [e.id, e]))
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectLabel = (id: number) => {
    const s = byId.get(id)
    return s ? (s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name) : name("subject", id)
  }
  const roomName = (buildingId: number, roomId: number) => {
    const building = buildings.find((b) => b.id === buildingId)
    const room = building?.rooms.find((r) => r.id === roomId)
    return room ? `${building!.name} ${room.name}` : "—"
  }

  const rows = institute
    ? plans
        .filter((p) => {
          const exam = examOf.get(p.termExamId)
          if (p.instituteId !== institute.id || !exam) return false
          if (chosen) return p.termExamId === chosen.id
          return (
            (!filter.class || String(exam.classId) === filter.class) &&
            (!filter.year || String(exam.yearId) === filter.year) &&
            (!filter.branch || String(exam.branchId) === filter.branch) &&
            (!filter.medium || exam.medium === filter.medium)
          )
        })
        .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime))
    : []

  const newHref = `/term-exam/seat-plans/new${chosen ? `?exam=${chosen.id}` : ""}`

  function remove() {
    if (!deleting) return
    deleteExamSeatPlan(deleting.id)
    toast.success("Seat plan deleted")
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Exam Seat Plan</CardTitle>
            <CardDescription>
              Where each subject of an exam is sat: the rooms, and the rolls seated in each.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={newHref}>
              <PlusIcon data-icon="inline-start" />
              Generate seat plan
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seat plans</CardTitle>
          <CardDescription>
            {rows.length} seat plan{rows.length === 1 ? "" : "s"}
            {chosen ? ` of ${chosen.fullName}` : filter.class ? " of the class's exams" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-12">Sl</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  {institute?.enableGroup && <TableHead>Group</TableHead>}
                  {institute?.enableVersion && <TableHead>Version</TableHead>}
                  <TableHead>Subtitle</TableHead>
                  <TableHead>Exam date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Rooms</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="w-40">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((p, i) => {
                    const exam = examOf.get(p.termExamId)!
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{name("class", exam.classId)}</TableCell>
                        <TableCell className="whitespace-nowrap">{exam.fullName}</TableCell>
                        <TableCell className="whitespace-nowrap">{subjectLabel(p.subjectId)}</TableCell>
                        {institute?.enableGroup && (
                          <TableCell>{p.groupId != null ? name("group", p.groupId) : "All"}</TableCell>
                        )}
                        {institute?.enableVersion && <TableCell>{p.version || "All"}</TableCell>}
                        <TableCell className="max-w-48 truncate">{p.subtitle || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatExamDate(p.examDate)}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatTime(p.startTime)} – {formatTime(p.endTime)}
                        </TableCell>
                        <TableCell className="max-w-56 truncate text-muted-foreground">
                          {p.rooms.map((r) => roomName(r.buildingId, r.roomId)).join(", ")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.rooms.reduce((sum, r) => sum + r.students, 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/term-exam/seat-plans/${p.id}/edit`}>
                                <PencilIcon data-icon="inline-start" />
                                Edit
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleting(p)}>
                              <Trash2Icon data-icon="inline-start" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                      {institute ? "No seat plan yet." : "Select an institute."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        {deleting && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this seat plan?</AlertDialogTitle>
              <AlertDialogDescription>
                The seating of {subjectLabel(deleting.subjectId)} in{" "}
                {examOf.get(deleting.termExamId)?.fullName ?? "the exam"} on {formatExamDate(deleting.examDate)} is
                removed, and its rooms are free again at that time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
