"use client"

import * as React from "react"
import Link from "next/link"
import { CircleAlertIcon, CopyIcon, EraserIcon, PrinterIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
import { PrintArea } from "@/components/reports/print-area"
import { RoutineGrid, RoutinePrintSheet } from "@/components/routine/routine-grid"
import { useStudentLookups } from "@/components/students/student-lookups"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { classYearSubjectStore, sectionStore, subjectStore } from "@/lib/academic-store"
import { useCurrentUser } from "@/lib/current-user"
import type { WeekDay } from "@/lib/institutes"
import {
  checkRoutineCell,
  clearRoutineCell,
  clearSectionRoutine,
  copySectionRoutine,
  periodsForShift,
  periodStore,
  periodTime,
  saveRoutineCell,
  useRoutineEntries,
  workingDays,
  type RoutinePeriod,
} from "@/lib/routine"
import { useTeachers } from "@/lib/teachers"

// Class Routine › Class Routine (editable) and View Class Routine: a
// section's week, a row per working day and a column per period of its
// shift. Clicking a cell sets the subject, teacher and room; a teacher or
// room already busy at that time anywhere in the institute is refused with
// the clash, while a teacher outside the subject or section is a warning.
// Copy another section's week, clear it, or print it.
export function ClassRoutine({ editable }: { editable: boolean }) {
  const scope = useFeeScope()
  const { institute, year, academicClass, section } = scope
  const user = useCurrentUser()
  const entries = useRoutineEntries()
  const teachers = useTeachers()
  const lookup = useStudentLookups()
  const periods = periodStore.useList(institute?.id ?? -1)
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const classSubjects = classYearSubjectStore.useList(institute?.id ?? -1)
  const allSections = sectionStore.useList(institute?.id ?? -1)
  const ready = institute && year && academicClass && section

  const days = institute ? workingDays(institute) : []
  const dayPeriods = periodsForShift(periods, section?.shiftId ?? null)
  const mine = entries.filter((e) => e.yearId === year?.id && e.sectionId === section?.id)
  const teacherName = new Map(teachers.map((t) => [t.id, t.name]))
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]))
  const names = {
    section: (id: number) => {
      const s = allSections.find((x) => x.id === id)
      return s ? `${lookup("class", s.classId)} ${s.name}` : "another section"
    },
    subject: (id: number) => subjectName.get(id) ?? "a subject",
  }
  // The class's subjects for the year (Class Year Subject), else all of the
  // institute's.
  const offered = classSubjects.find((c) => c.classId === academicClass?.id && c.yearId === year?.id)
  const subjectOptions = offered
    ? subjects.filter((s) => offered.details.some((d) => d.subjectId === s.id))
    : subjects

  const [editing, setEditing] = React.useState<{ day: WeekDay; period: RoutinePeriod } | null>(null)
  const [copying, setCopying] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)

  const cellOf = (day: WeekDay, period: RoutinePeriod) => {
    const e = mine.find((x) => x.day === day && x.periodId === period.id)
    if (!e) return null
    return {
      title: subjectName.get(e.subjectId) ?? "—",
      lines: [e.teacherId != null ? (teacherName.get(e.teacherId) ?? "—") : "No teacher", e.room ? `Room ${e.room}` : ""].filter(Boolean),
    }
  }

  const teaching = new Set(mine.map((e) => e.teacherId).filter((id): id is number => id != null))
  const classCount = mine.length
  const slots = days.length * dayPeriods.filter((p) => !p.isBreak).length

  const sheet = ready && (
    <RoutinePrintSheet
      institute={institute}
      title="Class Routine"
      subtitle={`${academicClass.name}, Section ${section.name}${section.shiftId != null ? ` (${lookup("shift", section.shiftId)} shift)` : ""} · ${year.name}`}
    >
      <RoutineGrid days={days} periods={dayPeriods} cellOf={cellOf} print />
    </RoutinePrintSheet>
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{editable ? "Class Routine" : "View Class Routine"}</CardTitle>
            <CardDescription>
              {editable
                ? "Click a period to set its subject, teacher and room. Double-booked teachers and rooms are refused."
                : "A section's weekly routine."}
            </CardDescription>
          </div>
          {editable && (
            <Button asChild size="sm" variant="outline">
              <Link href="/routine/periods">Manage periods</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} need={["class", "section"]} />
        </CardContent>
      </Card>

      {ready ? (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>
                {academicClass.name} {section.name} · {year.name}
              </CardTitle>
              <CardDescription>
                {classCount} of {slots} class periods filled · {teaching.size} teacher{teaching.size === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setCopying(true)}>
                    <CopyIcon data-icon="inline-start" />
                    Copy from section
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setClearing(true)} disabled={!classCount}>
                    <EraserIcon data-icon="inline-start" />
                    Clear
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!dayPeriods.length}>
                <PrinterIcon data-icon="inline-start" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dayPeriods.length ? (
              <div className="overflow-x-auto">
                <RoutineGrid
                  days={days}
                  periods={dayPeriods}
                  cellOf={cellOf}
                  onCell={editable ? (day, period) => setEditing({ day, period }) : undefined}
                />
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleAlertIcon className="size-4" />
                The institute has no periods for this section&apos;s shift yet.{" "}
                <Link href="/routine/periods" className="underline">
                  Add periods
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Select the class and section.</p>
      )}

      {sheet && dayPeriods.length > 0 && <PrintArea pageSize="A4 landscape">{sheet}</PrintArea>}

      {editing && ready && (
        <CellDialog
          key={`${editing.day}-${editing.period.id}`}
          day={editing.day}
          period={editing.period}
          existing={mine.find((e) => e.day === editing.day && e.periodId === editing.period.id)}
          subjectOptions={subjectOptions}
          teachers={teachers.filter((t) => t.instituteId === institute.id && t.status !== "Deleted")}
          onClose={() => setEditing(null)}
          onSave={(subjectId, teacherId, room) => {
            try {
              saveRoutineCell(
                {
                  instituteId: institute.id,
                  yearId: year.id,
                  sectionId: section.id,
                  day: editing.day,
                  periodId: editing.period.id,
                  subjectId,
                  teacherId,
                  room,
                },
                names,
                user.name
              )
              toast.success("Routine saved")
              setEditing(null)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "The period could not be saved.")
            }
          }}
          onClear={() => {
            clearRoutineCell(year.id, section.id, editing.day, editing.period.id)
            toast.success("Period cleared")
            setEditing(null)
          }}
          check={(subjectId, teacherId, room) =>
            checkRoutineCell(
              {
                instituteId: institute.id,
                yearId: year.id,
                sectionId: section.id,
                day: editing.day,
                periodId: editing.period.id,
                subjectId,
                teacherId,
                room,
              },
              names,
              entries,
              teachers
            )
          }
        />
      )}

      {ready && (
        <CopyDialog
          open={copying}
          onClose={() => setCopying(false)}
          sections={allSections.filter(
            (s) => s.id !== section.id && entries.some((e) => e.yearId === year.id && e.sectionId === s.id)
          )}
          label={(id) => names.section(id)}
          onCopy={(fromId) => {
            const result = copySectionRoutine(institute.id, year.id, fromId, section.id, names, user.name)
            if (result.skipped.length) {
              toast.warning(`${result.copied} periods copied, ${result.skipped.length} left empty`, {
                description: result.skipped.slice(0, 3).join(" "),
              })
            } else {
              toast.success(`${result.copied} periods copied`)
            }
            setCopying(false)
          }}
        />
      )}

      <AlertDialog open={clearing} onOpenChange={setClearing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this section&apos;s routine?</AlertDialogTitle>
            <AlertDialogDescription>
              All {classCount} periods of {academicClass?.name} {section?.name} for {year?.name} are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (year && section) clearSectionRoutine(year.id, section.id)
                toast.success("Routine cleared")
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CellDialog({
  day,
  period,
  existing,
  subjectOptions,
  teachers,
  onClose,
  onSave,
  onClear,
  check,
}: {
  day: WeekDay
  period: RoutinePeriod
  existing?: { subjectId: number; teacherId: number | null; room: string }
  subjectOptions: { id: number; name: string }[]
  teachers: { id: number; name: string; subjectIds: number[]; status: string }[]
  onClose: () => void
  onSave: (subjectId: number, teacherId: number | null, room: string) => void
  onClear: () => void
  check: (subjectId: number, teacherId: number | null, room: string) => { conflicts: string[]; warnings: string[] }
}) {
  const [subjectId, setSubjectId] = React.useState(existing ? String(existing.subjectId) : "")
  const [teacherId, setTeacherId] = React.useState(existing?.teacherId != null ? String(existing.teacherId) : "")
  const [room, setRoom] = React.useState(existing?.room ?? "")
  const subject = Number(subjectId) || 0
  const teacher = teacherId ? Number(teacherId) : null
  const result = subject ? check(subject, teacher, room) : { conflicts: [], warnings: [] }
  // Teachers of the subject first.
  const sorted = [...teachers].sort(
    (a, b) =>
      Number(b.subjectIds.includes(subject)) - Number(a.subjectIds.includes(subject)) || a.name.localeCompare(b.name)
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {day}, {period.name}
          </DialogTitle>
          <DialogDescription>{periodTime(period)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FilterField
            label="Subject"
            required
            value={subjectId}
            onChange={setSubjectId}
            options={subjectOptions.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select a subject"
          />
          <FilterField
            label="Teacher"
            value={teacherId}
            onChange={setTeacherId}
            options={sorted.map((t) => ({
              value: String(t.id),
              label: `${t.name}${t.subjectIds.includes(subject) ? " ✓" : ""}${t.status !== "Active" ? ` (${t.status})` : ""}`,
            }))}
            allLabel="No teacher yet"
          />
          <Field>
            <FieldLabel htmlFor="routine-room">Room</FieldLabel>
            <Input id="routine-room" value={room} placeholder="e.g. 101, Lab 1" onChange={(e) => setRoom(e.target.value)} />
          </Field>
          {result.conflicts.map((c) => (
            <p key={c} className="flex items-start gap-2 text-sm text-destructive">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {c}
            </p>
          ))}
          {result.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {w}
            </p>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          {existing ? (
            <Button variant="outline" className="text-destructive" onClick={onClear}>
              <EraserIcon data-icon="inline-start" />
              Clear period
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(subject, teacher, room)} disabled={!subject || result.conflicts.length > 0}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CopyDialog({
  open,
  onClose,
  sections,
  label,
  onCopy,
}: {
  open: boolean
  onClose: () => void
  sections: { id: number }[]
  label: (id: number) => string
  onCopy: (fromId: number) => void
}) {
  const [from, setFrom] = React.useState("")
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy another section&apos;s routine</DialogTitle>
          <DialogDescription>
            Replaces this section&apos;s week with the other one&apos;s subjects, teachers and rooms. Periods that
            would double-book a teacher or room are left empty.
          </DialogDescription>
        </DialogHeader>
        {sections.length ? (
          <FilterField
            label="Copy from"
            value={from}
            onChange={setFrom}
            options={sections.map((s) => ({ value: String(s.id), label: label(s.id) }))}
            placeholder="Select a section"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No other section has a routine this year.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onCopy(Number(from))} disabled={!from}>
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
