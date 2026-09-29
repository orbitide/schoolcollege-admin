"use client"

import * as React from "react"
import { PrinterIcon } from "lucide-react"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
import { PrintArea } from "@/components/reports/print-area"
import { RoutineGrid, RoutinePrintSheet } from "@/components/routine/routine-grid"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sectionStore, subjectStore } from "@/lib/academic-store"
import { useCurrentTeacher, useCurrentUser } from "@/lib/current-user"
import type { WeekDay } from "@/lib/institutes"
import { periodStore, useRoutineEntries, workingDays, type RoutinePeriod } from "@/lib/routine"
import { useTeachers } from "@/lib/teachers"

// Class Routine › Teacher Routine: one teacher's week across every section
// and shift they take, with the weekly load of each teacher below. A user
// signed in as a teacher sees only their own routine.
export function TeacherRoutine() {
  const scope = useFeeScope()
  const { institute, year, param, setParam } = scope
  const user = useCurrentUser()
  const self = useCurrentTeacher()
  const locked = user.role === "Teacher"
  const teachers = useTeachers().filter((t) => t.instituteId === institute?.id && t.status !== "Deleted")
  const entries = useRoutineEntries()
  const periods = periodStore.useList(institute?.id ?? -1)
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const sections = sectionStore.useList(institute?.id ?? -1)
  const lookup = useStudentLookups()
  const teacher = locked ? self : teachers.find((t) => String(t.id) === param("teacher"))

  const yearEntries = entries.filter((e) => e.instituteId === institute?.id && e.yearId === year?.id)
  const mine = yearEntries.filter((e) => e.teacherId === teacher?.id)
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]))
  const sectionLabel = (id: number) => {
    const s = sections.find((x) => x.id === id)
    return s ? `${lookup("class", s.classId)} ${s.name}` : "—"
  }

  // One column per distinct time slot of the shifts the teacher works in
  // (all periods when they have none yet).
  const shifts = new Set(mine.map((e) => periods.find((p) => p.id === e.periodId)?.shiftId ?? null))
  const columns: (RoutinePeriod & { ids: number[] })[] = []
  for (const p of [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    if (mine.length && !shifts.has(p.shiftId) && p.shiftId != null) continue
    const same = columns.find((c) => c.startTime === p.startTime && c.endTime === p.endTime)
    if (same) same.ids.push(p.id)
    else columns.push({ ...p, ids: [p.id] })
  }
  const days = institute ? workingDays(institute) : []
  const cellOf = (day: WeekDay, column: RoutinePeriod) => {
    const ids = (column as RoutinePeriod & { ids: number[] }).ids
    const here = mine.filter((e) => e.day === day && ids.includes(e.periodId))
    if (!here.length) return null
    return {
      title: here.map((e) => sectionLabel(e.sectionId)).join(" + "),
      lines: here.map((e) => `${subjectName.get(e.subjectId) ?? "—"}${e.room ? ` · ${e.room}` : ""}`),
      warn: here.length > 1,
    }
  }

  const load = teachers
    .map((t) => {
      const list = yearEntries.filter((e) => e.teacherId === t.id)
      return {
        teacher: t,
        periods: list.length,
        sections: new Set(list.map((e) => e.sectionId)).size,
        subjects: [...new Set(list.map((e) => subjectName.get(e.subjectId) ?? "—"))].join(", "),
        busiest: Math.max(0, ...days.map((d) => list.filter((e) => e.day === d).length)),
      }
    })
    .sort((a, b) => b.periods - a.periods || a.teacher.name.localeCompare(b.teacher.name))
  const unassigned = yearEntries.filter((e) => e.teacherId == null).length

  const sheet = institute && year && teacher && (
    <RoutinePrintSheet institute={institute} title="Teacher Routine" subtitle={`${teacher.name} · ${year.name}`}>
      <RoutineGrid days={days} periods={columns} cellOf={cellOf} print />
    </RoutinePrintSheet>
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Teacher Routine</CardTitle>
          <CardDescription>
            {locked ? "Your classes this week." : "A teacher's week across every section, and each teacher's load."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} show={["year"]} />
          {!locked && (
            <FilterField
              label="Teacher"
              required
              value={teacher ? String(teacher.id) : ""}
              onChange={(v) => setParam({ teacher: v })}
              options={teachers.map((t) => ({ value: String(t.id), label: `${t.name} (${t.teacherCode})` }))}
              placeholder="Select a teacher"
              disabled={!institute}
            />
          )}
        </CardContent>
      </Card>

      {teacher && year ? (
        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>
                {teacher.name} · {year.name}
              </CardTitle>
              <CardDescription>
                {mine.length} period{mine.length === 1 ? "" : "s"} a week in{" "}
                {new Set(mine.map((e) => e.sectionId)).size} section(s). A red cell is a clash.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!columns.length}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </CardHeader>
          <CardContent>
            {columns.length ? (
              <div className="overflow-x-auto">
                <RoutineGrid days={days} periods={columns} cellOf={cellOf} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">The institute has no periods yet.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          {locked && !self ? "Your user isn't linked to a teacher record." : "Select a teacher."}
        </p>
      )}
      {sheet && columns.length > 0 && <PrintArea pageSize="A4 landscape">{sheet}</PrintArea>}

      {!locked && institute && year && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly load</CardTitle>
            <CardDescription>
              Periods each teacher takes in {year.name}
              {unassigned ? ` · ${unassigned} routine period${unassigned === 1 ? " has" : "s have"} no teacher` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Periods / week</TableHead>
                    <TableHead className="text-right">Busiest day</TableHead>
                    <TableHead className="text-right">Sections</TableHead>
                    <TableHead>Subjects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {load.map((row) => (
                    <TableRow key={row.teacher.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium underline-offset-4 hover:underline"
                          onClick={() => setParam({ teacher: String(row.teacher.id) })}
                        >
                          {row.teacher.name}
                        </button>
                        {row.teacher.status !== "Active" && (
                          <span className="ml-2 text-xs text-muted-foreground">{row.teacher.status}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.periods}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.busiest}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.sections}</TableCell>
                      <TableCell className="text-xs">{row.subjects || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
