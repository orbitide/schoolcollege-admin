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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildingStore, classStore, groupStore, subjectStore } from "@/lib/academic-store"
import { useCurrentUser } from "@/lib/current-user"
import {
  assignRolls,
  bucketOf,
  overlappingPlan,
  overlapReason,
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
type RoomRow = {
  checked: boolean
  students: string
  groupId: string
  version: string
  columns: string
  benches: string
  perBench: string
}

const roomKey = (buildingId: number, roomId: number) => `${buildingId}-${roomId}`
const count = (value: string) => Number(value) || 0
const rowCapacity = (row: RoomRow) => count(row.columns) * count(row.benches) * count(row.perBench)

// A whole-number input inside a table cell, named for screen readers by `label`.
function CellNumber({
  label,
  value,
  onChange,
  disabled,
  invalid,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}) {
  return (
    <Input
      inputMode="numeric"
      className="w-16 text-center tabular-nums"
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-invalid={invalid}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
    />
  )
}

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
// ticked seating so many students of a group and version on its benches
// (the room's own layout, changeable for this exam), the rolls handed out
// in order and shown as they change.
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
        {
          checked: true,
          students: String(r.students),
          groupId: r.groupId != null ? String(r.groupId) : "",
          version: r.version,
          columns: String(r.totalColumns),
          benches: String(r.benchesPerColumn),
          perBench: String(r.studentsPerBench),
        },
      ])
    )
  )
  const [showProblems, setShowProblems] = React.useState(false)
  // Legacy opens a saved plan with its unused rooms hidden, a new one with all.
  const [showAll, setShowAll] = React.useState(!plan)

  const roomOf = new Map(options.map((o) => [roomKey(o.building.id, o.room.id), o.room]))
  const rowOf = (key: string): RoomRow => {
    const room = roomOf.get(key)
    return (
      rows[key] ?? {
        checked: false,
        students: "",
        groupId: "",
        version: "",
        columns: String(room?.totalColumns ?? ""),
        benches: String(room?.benchesPerColumn ?? ""),
        perBench: String(room?.studentsPerBench ?? ""),
      }
    )
  }
  const setRow = (key: string, patch: Partial<RoomRow>) => setRows((current) => ({ ...current, [key]: { ...rowOf(key), ...patch } }))

  // The ticked rooms, in building and room order, as the plan stores them.
  const picked = options.filter((o) => rowOf(roomKey(o.building.id, o.room.id)).checked)
  const pickedRooms = picked.map((o): SeatPlanRoom => {
    const row = rowOf(roomKey(o.building.id, o.room.id))
    return {
      buildingId: o.building.id,
      roomId: o.room.id,
      totalColumns: count(row.columns),
      benchesPerColumn: count(row.benches),
      studentsPerBench: count(row.perBench),
      students: count(row.students),
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
    roomLabel,
    split,
    others: plans.filter((p) => p.instituteId === institute.id),
    planLabel: (p) => {
      const other = exams.find((e) => e.id === p.termExamId)
      return `${other?.fullName ?? "another exam"} (${subjectName(p.subjectId)})`
    },
  })

  // Ticking rooms seats in each, in room order, as many of its group and
  // version as are left, up to its capacity.
  function tick(keys: string[]) {
    const seatedIn = new Map([...buckets].map(([k, b]) => [k, b.seated]))
    const patch: Record<string, RoomRow> = {}
    for (const key of keys) {
      const row = rowOf(key)
      const groupId = split.useGroup ? row.groupId || String(classGroups[0]?.id ?? "") : ""
      const version = split.useVersion ? row.version || academicVersions[0] : ""
      const bucket = bucketOf(groupId ? Number(groupId) : null, version, split.useGroup, split.useVersion)
      const left = (buckets.get(bucket)?.total ?? 0) - (seatedIn.get(bucket) ?? 0)
      const students = Math.max(0, Math.min(rowCapacity(row), left))
      seatedIn.set(bucket, (seatedIn.get(bucket) ?? 0) + students)
      patch[key] = { ...row, checked: true, groupId, version, students: String(students) }
    }
    setRows((current) => ({ ...current, ...patch }))
  }
  const keys = options.map((o) => roomKey(o.building.id, o.room.id))
  const allTicked = keys.length > 0 && picked.length === keys.length
  function tickAll(checked: boolean) {
    if (checked) return tick(keys.filter((k) => !rowOf(k).checked))
    setRows((current) => Object.fromEntries(keys.map((k) => [k, { ...(current[k] ?? rowOf(k)), checked: false }])))
  }
  const shown = options.filter((o) => showAll || rowOf(roomKey(o.building.id, o.room.id)).checked)
  const inputTotal = pickedRooms.reduce((sum, r) => sum + r.students, 0)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowProblems(true)
    if (problems.length) {
      toast.error(problems[0])
      return
    }
    saveExamSeatPlan(input, user.name, plan?.id)
    toast.success(plan ? "Seat plan updated" : "Seat Plan Added Successfully")
    router.push(`/seat-plans?exam=${exam.id}`)
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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {options.length > picked.length && picked.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Hide unused rooms" : `Show all rooms (${options.length - picked.length} more)`}
              </Button>
            )}
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allTicked ? true : picked.length ? "indeterminate" : false}
                        onCheckedChange={(checked) => tickAll(checked === true)}
                        aria-label="Use every room"
                      />
                    </TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-center">Columns</TableHead>
                    <TableHead className="text-center">Benches / column</TableHead>
                    <TableHead className="text-center">Students / bench</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    {split.useGroup && <TableHead>Group</TableHead>}
                    {split.useVersion && <TableHead>Version</TableHead>}
                    <TableHead className="w-28">Students</TableHead>
                    <TableHead>Roll range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(({ building, room }) => {
                    const key = roomKey(building.id, room.id)
                    const row = rowOf(key)
                    const capacity = rowCapacity(row)
                    const a = assignedBy.get(key)
                    const short = row.checked && a && a.found < count(row.students)
                    const where = `${building.name} ${room.name}`
                    return (
                      <TableRow key={key} className={cn(!row.checked && "text-muted-foreground")}>
                        <TableCell>
                          <Checkbox
                            checked={row.checked}
                            onCheckedChange={(checked) => (checked === true ? tick([key]) : setRow(key, { checked: false }))}
                            aria-label={`Use ${where}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{building.name}</TableCell>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>
                          <CellNumber
                            label={`Columns in ${where}`}
                            value={row.columns}
                            onChange={(v) => setRow(key, { columns: v })}
                            disabled={!row.checked}
                            invalid={row.checked && count(row.columns) < 1}
                          />
                        </TableCell>
                        <TableCell>
                          <CellNumber
                            label={`Benches per column in ${where}`}
                            value={row.benches}
                            onChange={(v) => setRow(key, { benches: v })}
                            disabled={!row.checked}
                            invalid={row.checked && count(row.benches) < 1}
                          />
                        </TableCell>
                        <TableCell>
                          <CellNumber
                            label={`Students per bench in ${where}`}
                            value={row.perBench}
                            onChange={(v) => setRow(key, { perBench: v })}
                            disabled={!row.checked}
                            invalid={row.checked && count(row.perBench) < 1}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{capacity}</TableCell>
                        {split.useGroup && (
                          <TableCell className="min-w-36">
                            <CellSelect
                              label={`Group of ${where}`}
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
                              label={`Version of ${where}`}
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
                            aria-label={`Students in ${where}`}
                            aria-invalid={row.checked && (count(row.students) > capacity || !!short)}
                            onChange={(e) => setRow(key, { students: e.target.value.replace(/\D/g, "") })}
                          />
                          {row.checked && count(row.students) > capacity && (
                            <p className="mt-1 text-xs text-destructive">Exceeded</p>
                          )}
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
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7 + (split.useGroup ? 1 : 0) + (split.useVersion ? 1 : 0)} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="tabular-nums">{inputTotal}</TableCell>
                    <TableCell className={cn("tabular-nums", seatedCount !== seated.length && "text-destructive")}>
                      {seatedCount} seated of {seated.length} examinee{seated.length === 1 ? "" : "s"}
                    </TableCell>
                  </TableRow>
                </TableFooter>
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
          {seatedCount < seated.length && (
            <p className="mt-3 text-sm text-muted-foreground">
              {seated.length - seatedCount} student{seated.length - seatedCount === 1 ? "" : "s"} still to seat.
            </p>
          )}
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
          <Link href={`/seat-plans?exam=${exam.id}`}>Cancel</Link>
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
          <Link href="/seat-plans">Back to seat plans</Link>
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
  // A plan already seats some of these students: the same part (open it
  // instead), or an overlapping one — all groups against one group, say.
  const existing =
    !plan && exam && subjectId != null ? overlappingPlan(plans, { termExamId: exam.id, subjectId, ...scope }) : null
  const blockedBy = existing ? overlapReason(scope, existing) : ""
  const subjectLabel = (id: number) => {
    const s = subjects.find((x) => x.id === id)
    return s ? (s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name) : name("subject", id)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/seat-plans${exam ? `?exam=${exam.id}` : ""}`}>
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
          {blockedBy || "This subject already has a seat plan."}{" "}
          <Link href={`/seat-plans/${existing.id}/edit`} className="font-medium text-foreground underline underline-offset-4">
            {blockedBy ? "Open that plan" : "Edit it"}
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
