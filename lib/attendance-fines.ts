"use client"

import * as React from "react"

import type { InstituteConfiguration } from "@/lib/institutes"
import {
  getStudentAttendance,
  todayIso,
  type StudentAttendance,
} from "@/lib/student-attendance"
import { fitsPlace, getStudents, type Enrolment, type EnrolmentPlace, type Student } from "@/lib/students"

// Legacy SchoolCollege MonthlyAttendanceFine: for a fine period (e.g. the
// 26th of one month to the 25th of the next), how many days each student of
// a section was absent and how many of those they are fined for, with a
// remark. One record per student and period; saving the period again
// updates it. In-memory dummy store for the browser session; replace with
// API calls once the backend endpoints exist.

export type AttendanceFine = {
  id: number
  instituteId: number
  classId: number
  sectionId: number
  studentId: number
  // ISO "YYYY-MM-DD", both days included.
  dateFrom: string
  dateTo: string
  // Absent days counted when the fine was saved.
  absentDays: number
  finedDays: number
  remarks: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const pad = (n: number) => String(n).padStart(2, "0")

// The day of the month, or the month's last day when it is shorter (a
// period "from the 31st" starts on 30 April).
function isoDay(year: number, monthIndex: number, day: number) {
  const date = new Date(year, monthIndex, 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(Math.min(day, last))}`
}

// Legacy GetDateRange: the latest fine period that has ended, from the
// institute's "day from" to its "day to" (of the next month when "day from"
// is later, e.g. 26th to 25th). Before this month's "day to" it is the
// period ending last month.
export function defaultFinePeriod(
  config: Pick<InstituteConfiguration, "dayFrom" | "dayTo">,
  today = todayIso()
) {
  const [year, month, day] = today.split("-").map(Number)
  return finePeriodEndingIn(config, year, config.dayTo > day ? month - 2 : month - 1)
}

// The fine period that ends in the month (0-based; months outside 0–11 roll
// into the next or previous year).
export function finePeriodEndingIn(
  config: Pick<InstituteConfiguration, "dayFrom" | "dayTo">,
  year: number,
  monthIndex: number
) {
  const fromMonth = config.dayFrom > config.dayTo ? monthIndex - 1 : monthIndex
  return {
    dateFrom: isoDay(year, fromMonth, config.dayFrom),
    dateTo: isoDay(year, monthIndex, config.dayTo),
  }
}

// Days one period leaves out before the next starts (positive) or shares
// with it (negative); 0 when they follow on, as with the 26th to the 25th.
export function finePeriodGap(config: Pick<InstituteConfiguration, "dayFrom" | "dayTo">) {
  // A year of periods, so short months and a "day to" of the 31st are seen.
  let worst = 0
  for (let month = 0; month < 12; month++) {
    const end = finePeriodEndingIn(config, 2026, month).dateTo
    const next = finePeriodEndingIn(config, 2026, month + 1).dateFrom
    const [y1, m1, d1] = end.split("-").map(Number)
    const [y2, m2, d2] = next.split("-").map(Number)
    const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) - 1
    if (Math.abs(days) > Math.abs(worst)) worst = days
  }
  return worst
}

// "26 Aug 2026 – 25 Sep 2026"
export function formatPeriod(dateFrom: string, dateTo: string) {
  const format = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number)
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }
  return `${format(dateFrom)} – ${format(dateTo)}`
}

export function periodError(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return "Both dates are required."
  if (dateFrom > dateTo) return "Date from must be on or before date to."
  return undefined
}

// Days marked absent in the section within the period.
function countAbsences(
  records: StudentAttendance[],
  sectionId: number,
  dateFrom: string,
  dateTo: string
) {
  const counts = new Map<number, number>()
  for (const r of records) {
    if (r.sectionId !== sectionId || r.isPresent || r.date < dateFrom || r.date > dateTo) continue
    counts.set(r.studentId, (counts.get(r.studentId) ?? 0) + 1)
  }
  return counts
}

export type FineRow = {
  student: Student
  enrolment: Enrolment
  absentDays: number
  // Absent days counted from attendance now, when they differ from what a
  // saved fine recorded (attendance was changed after it was saved).
  recountedDays?: number
  finedDays: number
  remarks: string
  saved?: AttendanceFine
}

// Legacy LoadAbsentStudentDetails: the section's active students who were
// absent in the period (or already have a fine saved for it), in roll
// order, with their absent days. A student with a fine already saved for
// the period shows what was saved; otherwise they are fined for every
// absent day.
export function fineSheet(
  students: Student[],
  records: StudentAttendance[],
  fines: AttendanceFine[],
  instituteId: number,
  place: EnrolmentPlace,
  dateFrom: string,
  dateTo: string
): FineRow[] {
  const absences = countAbsences(records, place.sectionId, dateFrom, dateTo)
  const saved = new Map(
    fines
      .filter(
        (f) =>
          f.instituteId === instituteId &&
          f.classId === place.classId &&
          f.dateFrom === dateFrom &&
          f.dateTo === dateTo
      )
      .map((f) => [f.studentId, f])
  )
  return students
    .flatMap<FineRow>((student) => {
      if (student.instituteId !== instituteId || student.status !== "Active") return []
      const enrolment = student.enrolments.find((e) => fitsPlace(e, place))
      if (!enrolment) return []
      const counted = absences.get(student.id) ?? 0
      const fine = saved.get(student.id)
      return fine
        ? [
            {
              student,
              enrolment,
              absentDays: fine.absentDays,
              recountedDays: counted !== fine.absentDays ? counted : undefined,
              finedDays: fine.finedDays,
              remarks: fine.remarks,
              saved: fine,
            },
          ]
        : counted > 0
          ? [{ student, enrolment, absentDays: counted, finedDays: counted, remarks: "" }]
          : []
    })
    .sort((a, b) =>
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
    )
}

// ---- Store ----


// A period already fined for institute 1's section with the most absences
// in the seeded attendance, so the manage page has something to show.
function seedFines(): AttendanceFine[] {
  const dateFrom = "2026-08-26"
  const dateTo = "2026-09-25"
  const records = getStudentAttendance()
  const absentBySection = new Map<number, number>()
  for (const r of records) {
    if (r.instituteId !== 1 || r.isPresent || r.date < dateFrom || r.date > dateTo) continue
    absentBySection.set(r.sectionId, (absentBySection.get(r.sectionId) ?? 0) + 1)
  }
  const sectionId = [...absentBySection].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0]
  if (sectionId == null) return []
  const absences = countAbsences(records, sectionId, dateFrom, dateTo)
  const at = "2026-09-26T10:00:00"
  return getStudents().flatMap<AttendanceFine>((student) => {
    const enrolment = student.enrolments.find((e) => e.yearId === 2 && e.sectionId === sectionId)
    if (student.instituteId !== 1 || student.status !== "Active" || !enrolment) return []
    const absentDays = absences.get(student.id) ?? 0
    if (!absentDays) return []
    return [
      {
        id: student.id,
        instituteId: 1,
        classId: enrolment.classId,
        sectionId,
        studentId: student.id,
        dateFrom,
        dateTo,
        absentDays,
        // Forgive the first day off.
        finedDays: Math.max(0, absentDays - 1),
        remarks: absentDays > 3 ? "Guardian informed" : "",
        createdBy: "Super Admin",
        createdAt: at,
        modifiedBy: "Super Admin",
        modifiedAt: at,
      },
    ]
  })
}

const seed = seedFines()
let fines: AttendanceFine[] = seed
const listeners = new Set<() => void>()

function current() {
  return fines
}

function emit(next: AttendanceFine[]) {
  fines = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAttendanceFines() {
  return React.useSyncExternalStore(subscribe, current, () => seed)
}

export type FineEntry = {
  studentId: number
  absentDays: number
  finedDays: number
  remarks: string
}

// Legacy StudentAttendanceService.SaveMonthlyAttendanceFine: adds a fine
// for each student without one for the period and updates the rest
// (moving it to this section if the student changed section). Returns how
// many were added and updated.
export function saveAttendanceFines(
  input: {
    instituteId: number
    classId: number
    sectionId: number
    dateFrom: string
    dateTo: string
    entries: FineEntry[]
  },
  user: string
) {
  if (!input.entries.length) throw new Error("There are no students to fine.")
  const error = periodError(input.dateFrom, input.dateTo)
  if (error) throw new Error(error)
  if (input.entries.some((e) => !Number.isInteger(e.finedDays) || e.finedDays < 0)) {
    throw new Error("Fined days must be a whole number of zero or more.")
  }
  const over = input.entries.filter((e) => e.finedDays > e.absentDays).length
  if (over) {
    throw new Error(
      `Fined days can't be more than absent days (${over} student${over === 1 ? "" : "s"}).`
    )
  }

  const all = current()
  const now = new Date().toISOString().slice(0, 19)
  const existing = new Map(
    all
      .filter(
        (f) =>
          f.instituteId === input.instituteId &&
          f.classId === input.classId &&
          f.dateFrom === input.dateFrom &&
          f.dateTo === input.dateTo
      )
      .map((f) => [f.studentId, f])
  )
  let nextId = Math.max(0, ...all.map((f) => f.id)) + 1
  let added = 0
  let updated = 0
  const changed = new Map<number, AttendanceFine>()
  const fresh: AttendanceFine[] = []

  for (const entry of input.entries) {
    const remarks = entry.remarks.trim()
    const old = existing.get(entry.studentId)
    if (!old) {
      fresh.push({
        id: nextId++,
        instituteId: input.instituteId,
        classId: input.classId,
        sectionId: input.sectionId,
        studentId: entry.studentId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        absentDays: entry.absentDays,
        finedDays: entry.finedDays,
        remarks,
        createdBy: user,
        createdAt: now,
        modifiedBy: user,
        modifiedAt: now,
      })
      added++
    } else if (
      old.sectionId !== input.sectionId ||
      old.absentDays !== entry.absentDays ||
      old.finedDays !== entry.finedDays ||
      old.remarks !== remarks
    ) {
      changed.set(old.id, {
        ...old,
        sectionId: input.sectionId,
        absentDays: entry.absentDays,
        finedDays: entry.finedDays,
        remarks,
        modifiedBy: user,
        modifiedAt: now,
      })
      updated++
    }
  }

  if (added || updated) emit([...all.map((f) => changed.get(f.id) ?? f), ...fresh])
  return { added, updated }
}

export type FineGroup = {
  key: string
  instituteId: number
  classId: number
  sectionId: number
  dateFrom: string
  dateTo: string
  totalStudents: number
  totalAbsentDays: number
  totalFinedDays: number
}

const groupKey = (f: Pick<AttendanceFine, "sectionId" | "dateFrom" | "dateTo">) =>
  `${f.sectionId}|${f.dateFrom}|${f.dateTo}`

// Legacy LoadManageAbsentFineDetails: the saved fines per section and
// period, latest period first, with their totals.
export function fineGroups(all: AttendanceFine[]): FineGroup[] {
  const groups = new Map<string, FineGroup>()
  for (const f of all) {
    const key = groupKey(f)
    const group = groups.get(key) ?? {
      key,
      instituteId: f.instituteId,
      classId: f.classId,
      sectionId: f.sectionId,
      dateFrom: f.dateFrom,
      dateTo: f.dateTo,
      totalStudents: 0,
      totalAbsentDays: 0,
      totalFinedDays: 0,
    }
    group.totalStudents++
    group.totalAbsentDays += f.absentDays
    group.totalFinedDays += f.finedDays
    groups.set(key, group)
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.dateFrom.localeCompare(a.dateFrom) ||
      a.instituteId - b.instituteId ||
      a.classId - b.classId ||
      a.sectionId - b.sectionId
  )
}

// Legacy DeleteMonthlyAttendanceAbsentFine: removes a section's fines for
// the period. Returns how many were removed.
export function deleteFineGroup(group: Pick<FineGroup, "sectionId" | "dateFrom" | "dateTo">) {
  const all = current()
  const key = groupKey(group)
  const keep = all.filter((f) => groupKey(f) !== key)
  const removed = all.length - keep.length
  if (removed) emit(keep)
  return removed
}
