"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildingStore, classStore, groupStore, subjectStore } from "@/lib/academic-store"
import { useCurrentUser } from "@/lib/current-user"
import {
  assignRolls,
  bucketOf,
  saveExamSeatPlan,
  seatPlanProblems,
  seatPlanRooms,
  seatPlanStudents,
  useExamSeatPlans,
  type ExamSeatPlan,
  type SeatPlanRoom,
} from "@/lib/exam-seat-plans"
import { academicVersions, type Institute } from "@/lib/institutes"
import { useMeritLists } from "@/lib/merit-lists"
import { useStudents } from "@/lib/students"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Scope = { groupId: number | null; version: string }
type RoomRow = { checked: boolean; students: string; groupId: string; version: string }

const roomKey = (buildingId: number, roomId: number) => `${buildingId}-${roomId}`

// A select inside a table cell, named for screen readers by `label`.
function CellSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

// The room table and exam details of one seat plan (legacy
// Partial/_GenerateSeatPlan): the rooms of the exam's buildings, each one
// ticked seating so many students of a group and version, the rolls handed
// out in order and shown as they change.
function SeatPlanEditor({
  institute,
  exam,
  subjectId,
  scope,
  plan,
}: {
  institute: Institute
  exam: TermExam
  subjectId: number
  scope: Scope
  plan?: ExamSeatPlan
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const students = useStudents()
  const meritLists = useMeritLists()
  const plans = useExamSeatPlans()
  const exams = useTermExams()
  const name = useStudentLookups()
  const buildings = buildingStore.useList(institute.id)
  const classes = classStore.useList(institute.id)
  const groups = groupStore.useList(institute.id)
  const subjects = subjectStore.useList(institute.id)

  const academicClass = classes.find((c) => c.id === exam.classId)
  const classGroups = academicClass?.hasSubjectGroup ? groups.filter((g) => academicClass.groupIds.includes(g.id)) : []
  // Rooms pick their group and version only when the plan covers several.
  const split = {
    useGroup: institute.enableGroup && classGroups.length > 0 && scope.groupId == null && exam.groupId == null,
    useVersion: institute.enableVersion && !scope.version && !exam.version,
  }
  const seated = seatPlanStudents(exam, subjectId, scope, { students, meritLists })
  const options = seatPlanRooms(buildings, exam.branchId)

  const [subtitle, setSubtitle] = React.useState(plan?.subtitle ?? "")
  const [examDate, setExamDate] = React.useState(plan?.examDate ?? exam.examStart)
  const [startTime, setStartTime] = React.useState(plan?.startTime ?? "09:00")
  const [endTime, setEndTime] = React.useState(plan?.endTime ?? "12:00")
  const [rows, setRows] = React.useState<Record<string, RoomRow>>(() =>
    Object.fromEntries(
      (plan?.rooms ?? []).map((r) => [
        roomKey(r.buildingId, r.roomId),
        { checked: true, students: String(r.students), groupId: r.groupId != null ? String(r.groupId) : "", version: r.version },
      ])
    )
  )
  const [showProblems, setShowProblems] = React.useState(false)

  const rowOf = (key: string): RoomRow => rows[key] ?? { checked: false, students: "", groupId: "", version: "" }
  const setRow = (key: string, patch: Partial<RoomRow>) => setRows((current) => ({ ...current, [key]: { ...rowOf(key), ...patch } }))

  // The ticked rooms, in building and room order, as the plan stores them.
  const picked = options.filter((o) => rowOf(roomKey(o.building.id, o.room.id)).checked)
  const pickedRooms = picked.map((o): SeatPlanRoom => {
    const row = rowOf(roomKey(o.building.id, o.room.id))
    return {
      buildingId: o.building.id,
      roomId: o.room.id,
      students: Number(row.students) || 0,
      groupId: split.useGroup ? (row.groupId ? Number(row.groupId) : null) : scope.groupId,
      version: split.useVersion ? row.version : scope.version,
      rollFrom: "",
      rollTo: "",
    }
  })
  const assignments = assignRolls(seated, pickedRooms, split)
  const assignedBy = new Map(picked.map((o, i) => [roomKey(o.building.id, o.room.id), assignments[i]]))
  const seatedCount = assignments.reduce((sum, a) => sum + a.found, 0)

  // The students of each group and version, and how many are seated so far.
  const buckets = new Map<string, { label: string; total: number; seated: number }>()
  for (const s of seated) {
    const key = bucketOf(s.enrolment.groupId, s.enrolment.version, split.useGroup, split.useVersion)
    const label =
      [split.useGroup && (s.enrolment.groupId != null ? name("group", s.enrolment.groupId) : "No group"), split.useVersion && (s.enrolment.version || "No version")]
        .filter(Boolean)
        .join(" · ") || "All students"
    const b = buckets.get(key) ?? { label, total: 0, seated: 0 }
    b.total++
    buckets.set(key, b)
  }
  picked.forEach((o, i) => {
    const room = pickedRooms[i]
    const b = buckets.get(bucketOf(room.groupId, room.version, split.useGroup, split.useVersion))
    if (b) b.seated += assignments[i].found
  })

  const roomLabel = (room: Pick<SeatPlanRoom, "buildingId" | "roomId">) => {
    const o = options.find((x) => x.building.id === room.buildingId && x.room.id === room.roomId)
    return o ? `building: ${o.building.name} and room: ${o.room.name}` : "a room"
  }
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? name("subject", id)
  const input = {
    instituteId: institute.id,
    termExamId: exam.id,
    subjectId,
    groupId: scope.groupId,
    version: scope.version,
    subtitle: subtitle.trim(),
    examDate,
    startTime,
    endTime,
    rooms: pickedRooms.map((r, i) => ({ ...r, rollFrom: assignments[i].rollFrom, rollTo: assignments[i].rollTo })),
  }
  const problems = seatPlanProblems(input, {
    id: plan?.id,
    total: seated.length,
    assignments,
    capacityOf: (room) => options.find((o) => o.building.id === room.buildingId && o.room.id === room.roomId)?.capacity ?? 0,
    roomLabel,
    split,
    others: plans.filter((p) => p.instituteId === institute.id),
    planLabel: (p) => {
      const other = exams.find((e) => e.id === p.termExamId)
      return `${other?.fullName ?? "another exam"} (${subjectName(p.subjectId)})`
    },
  })

  // Ticking a room seats as many of its group and version as are left, up to its capacity.
  function toggle(key: string, capacity: number, checked: boolean) {
    if (!checked) return setRow(key, { checked: false })
    const groupId = split.useGroup ? rowOf(key).groupId || String(classGroups[0]?.id ?? "") : ""
    const version = split.useVersion ? rowOf(key).version || academicVersions[0] : ""
    const b = buckets.get(bucketOf(groupId ? Number(groupId) : null, version, split.useGroup, split.useVersion))
    const left = b ? b.total - b.seated : 0
    setRow(key, { checked: true, groupId, version, students: String(Math.max(0, Math.min(capacity, left))) })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowProblems(true)
    if (problems.length) {
      toast.error(problems[0])
      return
    }
    saveExamSeatPlan(input, user.name, plan?.id)
    toast.success(plan ? "Seat plan updated" : "Seat Plan Added Successfully")
    router.push(`/term-exam/seat-plans?exam=${exam.id}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Exam</CardTitle>
          <CardDescription>
            {subjectName(subjectId)} of {exam.fullName}
            {scope.groupId != null ? ` · ${name("group", scope.groupId)}` : ""}
            {scope.version ? ` · ${scope.version}` : ""} · {seated.length} student{seated.length === 1 ? "" : "s"} to seat
            {exam.parentExamId != null ? " (those who failed it in the parent exam)" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="lg:col-span-4">
            <FieldLabel htmlFor="seat-subtitle">Subtitle</FieldLabel>
            <Input
              id="seat-subtitle"
              value={subtitle}
              placeholder="e.g. Half Yearly Examination 2026"
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="seat-date">Exam date</FieldLabel>
            <Input id="seat-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="seat-start">Start time</FieldLabel>
            <Input id="seat-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="seat-end">End time</FieldLabel>
            <Input id="seat-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Rooms</CardTitle>
            <CardDescription>
              Tick the rooms to use. Each seats the next rolls of its
              {split.useGroup && split.useVersion ? " group and version" : split.useGroup ? " group" : split.useVersion ? " version" : " students"}, in
              room order.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {[...buckets.values()].map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-md border px-2 py-1 tabular-nums",
                  b.seated === b.total ? "border-green-600/40 text-green-700 dark:text-green-400" : "text-muted-foreground"
                )}
              >
                {b.label}: {b.seated}/{b.total}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {options.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Building</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    {split.useGroup && <TableHead>Group</TableHead>}
                    {split.useVersion && <TableHead>Version</TableHead>}
                    <TableHead className="w-28">Students</TableHead>
                    <TableHead>Roll range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map(({ building, room, capacity }) => {
                    const key = roomKey(building.id, room.id)
                    const row = rowOf(key)
                    const a = assignedBy.get(key)
                    const short = row.checked && a && a.found < (Number(row.students) || 0)
                    return (
                      <TableRow key={key} className={cn(!row.checked && "text-muted-foreground")}>
                        <TableCell>
                          <Checkbox
                            checked={row.checked}
                            onCheckedChange={(checked) => toggle(key, capacity, checked === true)}
                            aria-label={`Use ${building.name} ${room.name}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{building.name}</TableCell>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{capacity}</TableCell>
                        {split.useGroup && (
                          <TableCell className="min-w-36">
                            <CellSelect
                              label={`Group of ${building.name} ${room.name}`}
                              value={row.groupId}
                              onChange={(v) => setRow(key, { groupId: v })}
                              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                              placeholder="Group"
                              disabled={!row.checked}
                            />
                          </TableCell>
                        )}
                        {split.useVersion && (
                          <TableCell className="min-w-36">
                            <CellSelect
                              label={`Version of ${building.name} ${room.name}`}
                              value={row.version}
                              onChange={(v) => setRow(key, { version: v })}
                              options={academicVersions.map((v) => ({ value: v, label: v }))}
                              placeholder="Version"
                              disabled={!row.checked}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={capacity}
                            inputMode="numeric"
                            value={row.students}
                            disabled={!row.checked}
                            aria-label={`Students in ${building.name} ${room.name}`}
                            aria-invalid={row.checked && ((Number(row.students) || 0) > capacity || !!short)}
                            onChange={(e) => setRow(key, { students: e.target.value.replace(/\D/g, "") })}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {row.checked && a?.found ? (
                            <>
                              <strong>
                                {a.rollFrom} – {a.rollTo}
                              </strong>{" "}
                              <span className="text-muted-foreground">({a.found})</span>
                            </>
                          ) : row.checked ? (
                            <span className="text-destructive">No students left</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No rooms yet.{" "}
              <Link
                href={`/institutes/${institute.id}/buildings`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Add buildings and rooms
              </Link>{" "}
              first.
            </p>
          )}
          <p className="mt-3 text-sm">
            Seated <strong className="tabular-nums">{seatedCount}</strong> of{" "}
            <strong className="tabular-nums">{seated.length}</strong> students
            {seatedCount < seated.length ? ` · ${seated.length - seatedCount} still to seat` : ""}.
          </p>
        </CardContent>
      </Card>

      {showProblems && problems.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/40 p-3 text-sm text-destructive" role="alert">
          {problems.map((p) => (
            <p key={p} className="flex items-start gap-2">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {p}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!options.length}>
          {plan ? "Save seat plan" : "Generate seat plan"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={`/term-exam/seat-plans?exam=${exam.id}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}

// Legacy ExamSeatPlan/GenerateSeatPlan: pick the exam and subject (and the
// group or version it covers, when the class splits into them) — or open
// an existing plan — then seat its students in rooms. A plan per exam,
// subject, group and version: picking one that exists opens it.
export function SeatPlanForm({ planId }: { planId?: number }) {
  const f = useExamReportFilter({ meritList: false })
  const plans = useExamSeatPlans()
  const exams = useTermExams()
  const name = useStudentLookups()
  const plan = planId != null ? plans.find((p) => p.id === planId) : undefined
  const planExam = plan && exams.find((e) => e.id === plan.termExamId)
  const institute = planExam ? f.institutes.find((i) => i.id === planExam.instituteId) : f.institute
  const iid = institute?.id ?? -1
  const subjects = subjectStore.useList(iid)
  const classes = classStore.useList(iid)
  const groups = groupStore.useList(iid)

  if (planId != null && (!plan || !planExam || !institute)) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-6 lg:px-6">
        <p className="text-sm text-muted-foreground">No exam seat plan found.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/term-exam/seat-plans">Back to seat plans</Link>
        </Button>
      </div>
    )
  }

  const exam = planExam ?? f.chosen
  const academicClass = exam && classes.find((c) => c.id === exam.classId)
  const classGroups =
    institute?.enableGroup && academicClass?.hasSubjectGroup && exam?.groupId == null
      ? groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []
  const subjectId = plan?.subjectId ?? exam?.subjects.find((s) => String(s.subjectId) === f.param("subject"))?.subjectId
  const scope: Scope = plan
    ? { groupId: plan.groupId, version: plan.version }
    : {
        groupId: classGroups.find((g) => String(g.id) === f.param("group"))?.id ?? null,
        version: institute?.enableVersion && !exam?.version ? f.param("version") : "",
      }
  // A plan for the same exam, subject and part already exists: open it instead.
  const existing =
    !plan && exam && subjectId != null
      ? plans.find(
          (p) =>
            p.termExamId === exam.id &&
            p.subjectId === subjectId &&
            p.groupId === scope.groupId &&
            p.version === scope.version
        )
      : undefined
  const subjectLabel = (id: number) => {
    const s = subjects.find((x) => x.id === id)
    return s ? (s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name) : name("subject", id)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/term-exam/seat-plans${exam ? `?exam=${exam.id}` : ""}`}>
          <ArrowLeftIcon data-icon="inline-start" />
          Seat plans
        </Link>
      </Button>
      <h3 className="text-xl font-semibold tracking-tight">{plan ? "Edit exam seat plan" : "Generate exam seat plan"}</h3>

      {!plan && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Exam and subject</CardTitle>
            <CardDescription>The subject of the exam to seat.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExamReportFilterFields filter={f} />
            <FilterField
              label="Subject"
              required
              value={subjectId != null ? String(subjectId) : ""}
              onChange={(v) => f.setParam({ subject: v })}
              options={(exam?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectLabel(s.subjectId) }))}
              placeholder="Select subject"
              disabled={!exam}
            />
            {classGroups.length > 0 && (
              <FilterField
                label="Group"
                value={scope.groupId != null ? String(scope.groupId) : ""}
                onChange={(v) => f.setParam({ group: v })}
                options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                allLabel="All groups"
              />
            )}
            {institute?.enableVersion && !exam?.version && (
              <FilterField
                label="Version"
                value={scope.version}
                onChange={(v) => f.setParam({ version: v })}
                options={academicVersions.map((v) => ({ value: v, label: v }))}
                allLabel="All versions"
              />
            )}
          </CardContent>
        </Card>
      )}

      {existing ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          This subject already has a seat plan.{" "}
          <Link href={`/term-exam/seat-plans/${existing.id}/edit`} className="font-medium text-foreground underline underline-offset-4">
            Edit it
          </Link>
        </p>
      ) : institute && exam && subjectId != null ? (
        <SeatPlanEditor
          key={`${exam.id}-${subjectId}-${scope.groupId}-${scope.version}-${plan?.id ?? "new"}`}
          institute={institute}
          exam={exam}
          subjectId={subjectId}
          scope={scope}
          plan={plan}
        />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          {exam ? "Please Select a Subject" : "Please Select a Term Exam"}
        </p>
      )}
    </div>
  )
}
