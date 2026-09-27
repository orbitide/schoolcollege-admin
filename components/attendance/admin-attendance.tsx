"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarCheckIcon, CalendarDaysIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  branchStore,
  classStore,
  groupStore,
  holidayStore,
  sectionStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import {
  attendanceSheet,
  dayOffNote,
  saveAttendance,
  todayIso,
  useStudentAttendance,
  type AttendanceRow,
} from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { cn } from "@/lib/utils"

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Legacy "Take Attendance By Admin" (StudentAttendance/AdminAttendance):
// pick a section and a day, tick who was present, and save. Taking it again
// for the same day updates what was saved.
export function AdminAttendance() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const records = useStudentAttendance()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const holidays = holidayStore.useList(iid)

  const today = todayIso()
  const date = param("date") || today
  const year = param("year") || String(years.find((y) => y.isCurrent)?.id ?? "")
  const medium = param("medium")
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const classSections = sections.filter(
    (s) =>
      s.status === "Active" &&
      s.classId === selectedClass?.id &&
      (!param("branch") || String(s.branchId) === param("branch")) &&
      (!param("shift") || String(s.shiftId) === param("shift")) &&
      (!param("version") || !s.version || s.version === param("version")) &&
      (!param("group") || s.groupId == null || String(s.groupId) === param("group"))
  )
  const section = classSections.find((s) => String(s.id) === param("section"))
  const dateError = date > today ? "Attendance can't be taken for a future date." : undefined

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const ready = institute && selectedClass && year && section && date && !dateError
  const rows = ready
    ? attendanceSheet(students, records, institute.id, {
        yearId: Number(year),
        classId: selectedClass.id,
        sectionId: section.id,
        medium,
        groupId: param("group") ? Number(param("group")) : null,
        version: param("version"),
      }, date)
    : []
  const missing = [
    !institute && "institute",
    !selectedClass && "class",
    !year && "academic year",
    !section && "section",
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Take Attendance By Admin</CardTitle>
          <CardDescription>
            Pick a section and a day, tick the students who were present and save. Taking
            attendance again for the same day updates it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({
                  institute: v,
                  branch: "",
                  medium: "",
                  class: "",
                  group: "",
                  year: "",
                  version: "",
                  shift: "",
                  section: "",
                })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, section: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, class: "", group: "", section: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={param("class")}
            onChange={(v) => setParam({ class: v, group: "", section: "" })}
            options={classes
              .filter((c) => c.status === "Active" && (!medium || !c.medium || c.medium === medium))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          <FilterField
            label="Academic year"
            required
            value={year}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({
              value: String(y.id),
              label: y.isCurrent ? `${y.name} (current)` : y.name,
            }))}
            placeholder="Select year"
            disabled={!institute}
          />
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={param("version")}
              onChange={(v) => setParam({ version: v, section: "" })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={param("shift")}
              onChange={(v) => setParam({ shift: v, section: "" })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder={selectedClass ? "Select section" : "Pick a class first"}
            disabled={!selectedClass}
          />
          <DateField
            value={date}
            max={today}
            onChange={(v) => setParam({ date: v === today ? "" : v })}
            error={dateError}
          />
        </CardContent>
      </Card>

      {ready ? (
        <AttendanceSheet
          key={`${section.id}|${year}|${date}|${medium}|${param("group")}|${param("version")}`}
          institute={institute}
          rows={rows}
          date={date}
          title={`${selectedClass.name}, Section ${section.name}`}
          note={dayOffNote(institute, holidays, date, selectedClass.medium || medium)}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDaysIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {dateError ? "Pick a day up to today." : `Select the ${missing.join(", ")}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              The section&apos;s students are listed here to take attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DateField({
  value,
  max,
  onChange,
  error,
}: {
  value: string
  max: string
  onChange: (value: string) => void
  error?: string
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        Date
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </FieldLabel>
      <Input
        id={id}
        type="date"
        value={value}
        max={max}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        aria-invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function AttendanceSheet({
  institute,
  rows,
  date,
  title,
  note,
}: {
  institute: Institute
  rows: AttendanceRow[]
  date: string
  title: string
  note?: string
}) {
  const user = useCurrentUser()
  // What is ticked now; starts from what was saved (unsaved means absent,
  // as in the legacy sheet).
  const [present, setPresent] = React.useState<Record<number, boolean>>(() =>
    Object.fromEntries(rows.map(({ student, record }) => [student.id, record?.isPresent ?? false]))
  )
  const [confirming, setConfirming] = React.useState(false)

  const isPresent = (id: number) => present[id] ?? false
  const presentCount = rows.filter(({ student }) => isPresent(student.id)).length
  const absentCount = rows.length - presentCount
  const taken = rows.filter((row) => row.record)
  const lastSaved = taken
    .map((row) => row.record!)
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))[0]
  const unsaved = rows.filter(({ student, record }) => record?.isPresent !== isPresent(student.id)).length
  const allPresent = rows.length > 0 && presentCount === rows.length
  const showRoll = institute.showClassRoll
  const actionLabel = taken.length ? "Update attendance" : "Take attendance"

  function toggle(id: number, value = !isPresent(id)) {
    setPresent((current) => ({ ...current, [id]: value }))
  }

  function markAll(value: boolean) {
    setPresent(Object.fromEntries(rows.map(({ student }) => [student.id, value])))
  }

  function save() {
    setConfirming(false)
    try {
      const { added, updated } = saveAttendance(
        {
          instituteId: institute.id,
          sectionId: rows[0].enrolment.sectionId!,
          date,
          entries: rows.map(({ student }) => ({ studentId: student.id, isPresent: isPresent(student.id) })),
        },
        user.name
      )
      if (!added && !updated) toast.info("Nothing changed", { description: "The saved attendance already matches." })
      else
        toast.success("Attendance taken successfully", {
          description: [added && `${added} added`, updated && `${updated} updated`].filter(Boolean).join(", "),
        })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The attendance could not be saved.")
    }
  }

  const stats = [
    { label: "Total students", value: rows.length, className: "text-foreground" },
    { label: "Present", value: presentCount, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Absent", value: absentCount, className: "text-rose-600 dark:text-rose-400" },
  ]

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {longDate(date)} ·{" "}
          {lastSaved
            ? `Taken; last saved by ${lastSaved.modifiedBy} at ${lastSaved.modifiedAt.slice(11, 16)} on ${lastSaved.modifiedAt.slice(0, 10)}.`
            : "Attendance not taken for this day yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {note && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>{note} You can still take attendance.</span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="grid flex-1 grid-cols-3 divide-x rounded-lg border">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 px-2 py-3">
                <span className={cn("text-2xl font-semibold tabular-nums", stat.className)}>{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="h-auto min-h-10 sm:w-48"
            onClick={() => setConfirming(true)}
            disabled={!rows.length}
          >
            <CalendarCheckIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        </div>

        {rows.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {unsaved
                  ? `${unsaved} student${unsaved === 1 ? "" : "s"} differ from what is saved.`
                  : "Everything ticked is saved."}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => markAll(true)}>
                  All present
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => markAll(false)}>
                  All absent
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>{showRoll ? classRollLabel(institute) : studentIdLabel(institute)}</TableHead>
                    <TableHead>Student name</TableHead>
                    <TableHead className="w-28">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={allPresent ? true : presentCount > 0 ? "indeterminate" : false}
                          onCheckedChange={(checked) => markAll(checked === true)}
                          aria-label="Mark all present"
                        />
                        Present
                      </label>
                    </TableHead>
                    <TableHead>Saved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ student, enrolment, record }, index) => {
                    const here = isPresent(student.id)
                    return (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        data-state={here ? "selected" : undefined}
                        onClick={() => toggle(student.id)}
                      >
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="tabular-nums">
                          {showRoll ? enrolment.classRoll || "—" : student.studentIdentificationNo}
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            className="size-5"
                            checked={here}
                            onCheckedChange={(checked) => toggle(student.id, checked === true)}
                            aria-label={`${student.name} present`}
                          />
                        </TableCell>
                        <TableCell>
                          {record ? (
                            <Badge
                              variant="outline"
                              className={
                                record.isPresent
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                  : "border-rose-500/40 text-rose-700 dark:text-rose-400"
                              }
                            >
                              {record.isPresent ? "Present" : "Absent"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Not taken</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center">
              <Button type="button" onClick={() => setConfirming(true)}>
                <CalendarCheckIcon data-icon="inline-start" />
                {actionLabel}
              </Button>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active students are enrolled in this section for the year.
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              Total present: <strong className="text-foreground">{presentCount}</strong> and total
              absent: <strong className="text-foreground">{absentCount}</strong> for {title} on{" "}
              {longDate(date)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
