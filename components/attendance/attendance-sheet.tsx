"use client"

import * as React from "react"
import { CalendarCheckIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
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
import { useCurrentUser } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import { resetAttendance, saveAttendance, type AttendanceRow } from "@/lib/student-attendance"
import type { Enrolment, Student } from "@/lib/students"
import { cn } from "@/lib/utils"

export function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function DateField({
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

// One student on a sheet, with what was saved for them if anything.
export type SheetRow = {
  student: Student
  enrolment: Enrolment
  record?: { isPresent: boolean; modifiedBy: string; modifiedAt: string }
}

export type SheetEntry = { studentId: number; sectionId: number | null; isPresent: boolean }

// Part of the sheet's key: how many of its students have a saved record, so
// the ticks start over from what is saved after a reset.
export function savedKey(rows: SheetRow[]) {
  return rows.filter((row) => row.record).length
}

// Legacy _studentAttendanceList / _examStudentAttendanceList: students with a
// present tick each, the counts, and saving after a confirm. Unsaved
// students start absent, as in legacy. Key it by `savedKey` (plus whatever
// picks the rows) so the ticks start over after a reset.
export function AttendanceSheet({
  institute,
  rows,
  title,
  context,
  note,
  emptyText,
  sectionName,
  onSave,
  onReset,
}: {
  institute: Institute
  rows: SheetRow[]
  title: string
  // What the sheet is for beside the title: the day, or the exam's scope.
  context: string
  note?: string
  emptyText: string
  // Adds a Section column, for sheets spanning several sections.
  sectionName?: (sectionId: number | null) => string
  onSave: (entries: SheetEntry[]) => { added: number; updated: number }
  // Clears what was saved; returns how many records went. No Reset without it.
  onReset?: () => number
}) {
  // What is ticked now; starts from what was saved.
  const [present, setPresent] = React.useState<Record<number, boolean>>(() =>
    Object.fromEntries(rows.map(({ student, record }) => [student.id, record?.isPresent ?? false]))
  )
  const [confirming, setConfirming] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)

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
      const { added, updated } = onSave(
        rows.map(({ student, enrolment }) => ({
          studentId: student.id,
          sectionId: enrolment.sectionId,
          isPresent: isPresent(student.id),
        }))
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

  function reset() {
    setResetting(false)
    const removed = onReset?.() ?? 0
    toast.success("Attendance reset", {
      description: `${removed} saved record${removed === 1 ? "" : "s"} removed.`,
    })
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
          {context} ·{" "}
          {lastSaved
            ? `Taken; last saved by ${lastSaved.modifiedBy} at ${lastSaved.modifiedAt.slice(11, 16)} on ${lastSaved.modifiedAt.slice(0, 10)}.`
            : "Attendance not taken yet."}
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
                {onReset && taken.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setResetting(true)}
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    {sectionName && <TableHead>Section</TableHead>}
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
                        {sectionName && <TableCell>{sectionName(enrolment.sectionId)}</TableCell>}
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
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              Total present: <strong className="text-foreground">{presentCount}</strong> and total
              absent: <strong className="text-foreground">{absentCount}</strong> for {title}, {context}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetting} onOpenChange={setResetting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              The saved attendance of {title}, {context} ({taken.length} student
              {taken.length === 1 ? "" : "s"}) will be removed so it can be taken again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// The daily sheet of one section (Take Attendance and Take Attendance By
// Admin): saves through saveAttendance, stamping the teacher when one takes
// it, and can be reset for the day.
export function DailyAttendanceSheet({
  institute,
  sectionId,
  teacherId,
  rows,
  date,
  title,
  note,
}: {
  institute: Institute
  sectionId: number
  // The teacher taking it; unset when an admin does.
  teacherId?: number
  rows: AttendanceRow[]
  date: string
  title: string
  note?: string
}) {
  const user = useCurrentUser()
  return (
    <AttendanceSheet
      institute={institute}
      rows={rows}
      title={title}
      context={longDate(date)}
      note={note}
      emptyText="No active students are enrolled in this section for the year."
      onSave={(entries) =>
        saveAttendance({ instituteId: institute.id, sectionId, date, teacherId, entries }, user.name)
      }
      onReset={() => resetAttendance({ sectionId, date })}
    />
  )
}
