"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

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
import { FilterField } from "@/components/term-exams/term-exam-fields"
import {
  branchStore,
  buildingStore,
  classStore,
  groupStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { deleteExamSeatPlan, useExamSeatPlans, type ExamSeatPlan } from "@/lib/exam-seat-plans"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useTermExams } from "@/lib/term-exams"

export const formatExamDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

// "10:00" → "10:00 AM".
export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  if (!Number.isFinite(h)) return hhmm
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

// Legacy ExamSeatPlan/ManageExamSeatPlan: every institute's seat plans, one
// per exam subject (and group / version), narrowed by institute, academic
// structure, exam and subject — each filter "All" until chosen — with the
// date and time and rooms, to edit or delete.
export function SeatPlanList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const plans = useExamSeatPlans()
  const exams = useTermExams()
  const name = useStudentLookups()
  const subjects = subjectStore.useAll()
  const buildings = buildingStore.useAll()
  const canPick = institutes.length > 1
  const [deleting, setDeleting] = React.useState<ExamSeatPlan | null>(null)

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const branches = branchStore.useList(iid)
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const groups = groupStore.useList(iid)

  const medium = param("medium")
  const version = param("version")
  const is = (value: number | null, key: string) => !param(key) || String(value) === param(key)
  const examOf = new Map(exams.map((e) => [e.id, e]))
  const instituteOf = new Map(institutes.map((i) => [i.id, i]))
  // The exams the structure filters leave (legacy LoadTermExam).
  const examOptions = institute
    ? exams
        .filter(
          (e) =>
            e.instituteId === institute.id &&
            e.status !== "Deleted" &&
            (!medium || e.medium === medium) &&
            is(e.classId, "class") &&
            is(e.yearId, "year") &&
            is(e.branchId, "branch")
        )
        .sort((a, b) => a.rank - b.rank)
    : []
  const chosen = examOptions.find((e) => String(e.id) === param("exam"))

  const subjectLabel = (id: number) => {
    const s = subjects.find((subject) => subject.id === id)
    return s ? (s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name) : name("subject", id)
  }
  const roomName = (buildingId: number, roomId: number) => {
    const building = buildings.find((b) => b.id === buildingId)
    const room = building?.rooms.find((r) => r.id === roomId)
    return room ? `${building!.name} ${room.name}` : "—"
  }

  const ofExams = plans.flatMap((plan) => {
    const exam = examOf.get(plan.termExamId)
    const planInstitute = instituteOf.get(plan.instituteId)
    if (!exam || !planInstitute || (institute && plan.instituteId !== institute.id)) return []
    const fits =
      (!medium || exam.medium === medium) &&
      is(exam.classId, "class") &&
      is(exam.yearId, "year") &&
      is(exam.branchId, "branch") &&
      (!param("exam") || String(exam.id) === param("exam"))
    return fits ? [{ plan, exam, institute: planInstitute }] : []
  })
  // Legacy's group and version filters keep the plans made for all groups
  // (or versions) too, since they seat that group's students as well.
  const subjectOptions = [...new Set(ofExams.map((row) => row.plan.subjectId))].map((id) => ({
    value: String(id),
    label: subjectLabel(id),
  }))
  const rows = ofExams
    .filter(
      ({ plan }) =>
        is(plan.subjectId, "subject") &&
        (!param("group") || plan.groupId == null || String(plan.groupId) === param("group")) &&
        (!version || !plan.version || plan.version === version)
    )
    .sort(
      (a, b) =>
        a.plan.instituteId - b.plan.instituteId ||
        a.plan.examDate.localeCompare(b.plan.examDate) ||
        a.plan.startTime.localeCompare(b.plan.startTime)
    )

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const clearExam = { exam: "", subject: "" }
  const newHref = `/seat-plans/new${chosen ? `?${new URLSearchParams({ exam: String(chosen.id), ...(param("subject") && { subject: param("subject") }) })}` : ""}`
  // Optional columns only show when a listed plan's institute uses them (as
  // the legacy grid hides its all-"-" branch and medium columns).
  const show = {
    institute: !institute,
    branch: rows.some((r) => r.institute.enableBranch),
    medium: rows.some((r) => r.institute.enableMedium),
    group: rows.some((r) => r.institute.enableGroup),
    version: rows.some((r) => r.institute.enableVersion),
  }
  const columnCount = 11 + Object.values(show).filter(Boolean).length

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
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", ...clearExam })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, ...clearExam })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, ...clearExam })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v, ...clearExam })}
              options={classes
                .filter((c) => !medium || !c.medium || c.medium === medium)
                .map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {institute && (
            <FilterField
              label="Academic year"
              value={param("year")}
              onChange={(v) => setParam({ year: v, ...clearExam })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              allLabel="All years"
            />
          )}
          {institute && (
            <FilterField
              label="Term exam"
              value={chosen ? String(chosen.id) : ""}
              onChange={(v) => setParam({ exam: v, subject: "" })}
              options={examOptions.map((e) => ({ value: String(e.id), label: e.fullName }))}
              allLabel="All term exams"
            />
          )}
          <FilterField
            label="Subject"
            value={subjectOptions.some((o) => o.value === param("subject")) ? param("subject") : ""}
            onChange={(v) => setParam({ subject: v })}
            options={subjectOptions}
            allLabel="All subjects"
            disabled={!subjectOptions.length}
          />
          {institute?.enableGroup && (
            <FilterField
              label="Group"
              value={param("group")}
              onChange={(v) => setParam({ group: v })}
              options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={version}
              onChange={(v) => setParam({ version: v })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seat plans</CardTitle>
          <CardDescription>
            {rows.length} seat plan{rows.length === 1 ? "" : "s"}
            {chosen ? ` of ${chosen.fullName}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-12">Sl</TableHead>
                  {show.institute && <TableHead>Institute</TableHead>}
                  {show.branch && <TableHead>Branch</TableHead>}
                  {show.medium && <TableHead>Medium</TableHead>}
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term exam</TableHead>
                  <TableHead>Subject</TableHead>
                  {show.group && <TableHead>Group</TableHead>}
                  {show.version && <TableHead>Version</TableHead>}
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
                  rows.map(({ plan: p, exam, institute: planInstitute }, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      {show.institute && (
                        <TableCell className="whitespace-nowrap">
                          {planInstitute.shortName || planInstitute.name}
                        </TableCell>
                      )}
                      {show.branch && (
                        <TableCell className="whitespace-nowrap">
                          {!planInstitute.enableBranch ? "—" : exam.branchId != null ? name("branch", exam.branchId) : "All"}
                        </TableCell>
                      )}
                      {show.medium && (
                        <TableCell>{!planInstitute.enableMedium ? "—" : exam.medium || "All"}</TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">{name("class", exam.classId)}</TableCell>
                      <TableCell>{name("year", exam.yearId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{exam.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{subjectLabel(p.subjectId)}</TableCell>
                      {show.group && (
                        <TableCell>
                          {!planInstitute.enableGroup ? "—" : p.groupId != null ? name("group", p.groupId) : "All"}
                        </TableCell>
                      )}
                      {show.version && (
                        <TableCell>{!planInstitute.enableVersion ? "—" : p.version || "All"}</TableCell>
                      )}
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
                            <Link href={`/seat-plans/${p.id}/edit`}>
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                      No seat plans match these filters.
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
