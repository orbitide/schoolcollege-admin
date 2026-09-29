"use client"

import * as React from "react"

import { createRecordStore, sectionStore } from "@/lib/academic-store"
import { logChanges } from "@/lib/common-log"
import { weekDays, type AcademicRecord, type Institute, type WeekDay } from "@/lib/institutes"
import { getTeachers, type Teacher } from "@/lib/teachers"

// Class routine (spec 03-academics/class-routine-planning.md): an
// institute's periods (with times, breaks, and optionally one shift), and
// for each section of a year what is taught in each period of each working
// day, by whom and where. Saving a cell that double-books a teacher or a
// room (any section, any shift, overlapping times) is refused with the
// clash; a teacher outside the subject or section they're put on is only a
// warning. In-memory like the rest of admin; replace with API calls once the
// backend endpoints exist.

export type RoutinePeriod = AcademicRecord & {
  // "HH:MM", 24-hour.
  startTime: string
  endTime: string
  isBreak: boolean
  // null: every shift.
  shiftId: number | null
}

const period = (
  id: number,
  name: string,
  startTime: string,
  endTime: string,
  shiftId: number,
  rank: number,
  isBreak = false
): RoutinePeriod => ({ id, instituteId: 1, name, startTime, endTime, isBreak, shiftId, rank, status: "Active" })

// Institute 1: five periods and a tiffin break in each of its shifts.
export const periodStore = createRecordStore<RoutinePeriod>(
  "ClassPeriod",
  [
    period(1, "1st Period", "07:30", "08:15", 1, 1),
    period(2, "2nd Period", "08:15", "09:00", 1, 2),
    period(3, "3rd Period", "09:00", "09:45", 1, 3),
    period(4, "Tiffin", "09:45", "10:15", 1, 4, true),
    period(5, "4th Period", "10:15", "11:00", 1, 5),
    period(6, "5th Period", "11:00", "11:45", 1, 6),
    period(7, "1st Period", "12:30", "13:15", 2, 1),
    period(8, "2nd Period", "13:15", "14:00", 2, 2),
    period(9, "3rd Period", "14:00", "14:45", 2, 3),
    period(10, "Tiffin", "14:45", "15:10", 2, 4, true),
    period(11, "4th Period", "15:10", "15:55", 2, 5),
    period(12, "5th Period", "15:55", "16:40", 2, 6),
  ],
  {
    rankWithin: "shiftId",
    compare: (a, b) => (a.shiftId ?? 0) - (b.shiftId ?? 0) || a.startTime.localeCompare(b.startTime) || a.rank - b.rank,
  }
)

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

// "7:30 AM" for "07:30".
export function timeLabel(time: string) {
  if (!TIME_PATTERN.test(time)) return time
  const [h, m] = time.split(":").map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

export const periodTime = (p: Pick<RoutinePeriod, "startTime" | "endTime">) =>
  `${timeLabel(p.startTime)} – ${timeLabel(p.endTime)}`

const overlaps = (a: Pick<RoutinePeriod, "startTime" | "endTime">, b: Pick<RoutinePeriod, "startTime" | "endTime">) =>
  a.startTime < b.endTime && b.startTime < a.endTime

// Other periods of the same shift (or of every shift, for one that covers
// all) whose times overlap, for the period form.
export function overlappingPeriod(
  candidate: Pick<RoutinePeriod, "startTime" | "endTime" | "shiftId">,
  siblings: RoutinePeriod[]
) {
  return siblings.find(
    (p) =>
      (p.shiftId == null || candidate.shiftId == null || p.shiftId === candidate.shiftId) &&
      overlaps(p, candidate)
  )
}

// The periods a section's day is made of: those of its shift and those of
// every shift, by start time.
export function periodsForShift(periods: RoutinePeriod[], shiftId: number | null) {
  return periods
    .filter((p) => p.status === "Active" && (p.shiftId == null || shiftId == null || p.shiftId === shiftId))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

// The institute's school days in week order, from its first day of the week
// and without its weekend.
export function workingDays(institute: Pick<Institute, "startDayOfWeek" | "weekend">): WeekDay[] {
  const start = weekDays.indexOf(institute.startDayOfWeek)
  return weekDays
    .map((_, i) => weekDays[(start + i) % weekDays.length])
    .filter((day) => !institute.weekend.includes(day))
}

// ---- Routine entries ----

export type RoutineEntry = {
  id: number
  instituteId: number
  yearId: number
  sectionId: number
  day: WeekDay
  periodId: number
  subjectId: number
  teacherId: number | null
  room: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type RoutineCellInput = Pick<
  RoutineEntry,
  "instituteId" | "yearId" | "sectionId" | "day" | "periodId" | "subjectId" | "teacherId" | "room"
>

const seedUser = "Super Admin"
const seedStamp = "2026-01-04T09:00:00.000Z"

// Class Six A (morning) and Six B (day) of 2026, the same week in both
// shifts so no teacher is double-booked: Bangla by Abdul Karim, English by
// Salma Begum, Maths and ICT by Mahmudul Hasan.
function seedEntries(): RoutineEntry[] {
  const days: WeekDay[] = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  const teacherOf: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 3 }
  const rooms: Record<number, string> = { 1: "101", 2: "201" }
  const slots: Record<number, number[]> = { 1: [1, 2, 3, 5, 6], 2: [7, 8, 9, 11, 12] }
  const entries: RoutineEntry[] = []
  for (const sectionId of [1, 2]) {
    days.forEach((day, d) => {
      slots[sectionId].forEach((periodId, p) => {
        const subjectId = [1, 2, 3, 4, 3, 1][(d + p) % 6]
        entries.push({
          id: entries.length + 1,
          instituteId: 1,
          yearId: 2,
          sectionId,
          day,
          periodId,
          subjectId,
          teacherId: teacherOf[subjectId],
          room: subjectId === 4 ? "Lab 1" : rooms[sectionId],
          createdBy: seedUser,
          createdAt: seedStamp,
          modifiedBy: seedUser,
          modifiedAt: seedStamp,
        })
      })
    })
  }
  return entries
}

const seed = seedEntries()
let entries: RoutineEntry[] = seed
const listeners = new Set<() => void>()

function emit(next: RoutineEntry[]) {
  logChanges("ClassRoutine", entries, next)
  entries = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRoutineEntries() {
  return React.useSyncExternalStore(subscribe, () => entries, () => seed)
}

export function getRoutineEntries() {
  return entries
}

export type RoutineCheck = {
  // Hard clashes: the cell can't be saved.
  conflicts: string[]
  // Soft: saved, but worth a look.
  warnings: string[]
}

const sameSlot = (e: Pick<RoutineEntry, "sectionId" | "day" | "periodId">, c: Pick<RoutineEntry, "sectionId" | "day" | "periodId">) =>
  e.sectionId === c.sectionId && e.day === c.day && e.periodId === c.periodId

// What stops the cell being saved, and what only deserves a warning.
// `names` resolves ids for the messages.
export function checkRoutineCell(
  input: RoutineCellInput,
  names: { section: (id: number) => string; subject: (id: number) => string },
  all: RoutineEntry[] = entries,
  teachers: Teacher[] = getTeachers()
): RoutineCheck {
  const conflicts: string[] = []
  const warnings: string[] = []
  const periods = periodStore.getList(input.instituteId)
  const slot = periods.find((p) => p.id === input.periodId)
  const section = sectionStore.getList(input.instituteId).find((s) => s.id === input.sectionId)
  if (!slot) return { conflicts: ["The period no longer exists."], warnings }
  if (slot.isBreak) conflicts.push(`${slot.name} is a break; no class can be put in it.`)
  if (section && slot.shiftId != null && section.shiftId != null && slot.shiftId !== section.shiftId) {
    conflicts.push(`${slot.name} belongs to another shift than this section.`)
  }
  const room = input.room.trim().toLowerCase()
  for (const other of all) {
    if (other.instituteId !== input.instituteId || other.yearId !== input.yearId || other.day !== input.day) continue
    if (sameSlot(other, input)) continue
    const otherPeriod = periods.find((p) => p.id === other.periodId)
    if (!otherPeriod || !overlaps(otherPeriod, slot)) continue
    const where = `${names.section(other.sectionId)} (${names.subject(other.subjectId)}, ${periodTime(otherPeriod)})`
    if (input.teacherId != null && other.teacherId === input.teacherId) {
      const teacher = teachers.find((t) => t.id === input.teacherId)
      conflicts.push(`${teacher?.name ?? "This teacher"} already takes ${where} on ${input.day}.`)
    }
    if (room && other.room.trim().toLowerCase() === room) {
      conflicts.push(`Room ${input.room.trim()} is already used by ${where} on ${input.day}.`)
    }
  }
  const teacher = input.teacherId != null ? teachers.find((t) => t.id === input.teacherId) : undefined
  if (teacher) {
    if (teacher.status !== "Active") warnings.push(`${teacher.name} is ${teacher.status.toLowerCase()}.`)
    if (!teacher.subjectIds.includes(input.subjectId)) {
      warnings.push(`${teacher.name} isn't set up to teach ${names.subject(input.subjectId)}.`)
    }
    if (!teacher.sections.some((s) => s.sectionId === input.sectionId && s.yearId === input.yearId)) {
      warnings.push(`${teacher.name} isn't one of this section's teachers (Section Teacher).`)
    }
  } else {
    warnings.push("No teacher is assigned.")
  }
  return { conflicts, warnings }
}

// Saves (adds or replaces) a cell. Throws the first clash, if any.
export function saveRoutineCell(
  input: RoutineCellInput,
  names: { section: (id: number) => string; subject: (id: number) => string },
  user: string
) {
  if (!input.subjectId) throw new Error("Select the subject.")
  const { conflicts } = checkRoutineCell(input, names)
  if (conflicts.length) throw new Error(conflicts[0])
  const stamp = new Date().toISOString()
  const existing = entries.find((e) => e.yearId === input.yearId && sameSlot(e, input))
  const clean = { ...input, room: input.room.trim() }
  if (existing) {
    emit(entries.map((e) => (e.id === existing.id ? { ...e, ...clean, modifiedBy: user, modifiedAt: stamp } : e)))
    return
  }
  emit([
    ...entries,
    {
      ...clean,
      id: Math.max(0, ...entries.map((e) => e.id)) + 1,
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    },
  ])
}

export function clearRoutineCell(yearId: number, sectionId: number, day: WeekDay, periodId: number) {
  emit(entries.filter((e) => !(e.yearId === yearId && sameSlot(e, { sectionId, day, periodId }))))
}

export function clearSectionRoutine(yearId: number, sectionId: number) {
  emit(entries.filter((e) => !(e.yearId === yearId && e.sectionId === sectionId)))
}

// Copies another section's week onto this one (same periods, subjects,
// teachers and rooms), replacing it. Cells that would double-book a teacher
// or room are left empty and reported.
export function copySectionRoutine(
  instituteId: number,
  yearId: number,
  fromSectionId: number,
  toSectionId: number,
  names: { section: (id: number) => string; subject: (id: number) => string },
  user: string
) {
  const source = entries.filter((e) => e.yearId === yearId && e.sectionId === fromSectionId)
  let working = entries.filter((e) => !(e.yearId === yearId && e.sectionId === toSectionId))
  const stamp = new Date().toISOString()
  let id = Math.max(0, ...entries.map((e) => e.id))
  const skipped: string[] = []
  for (const e of source) {
    const input: RoutineCellInput = { ...e, sectionId: toSectionId, instituteId }
    const { conflicts } = checkRoutineCell(input, names, working)
    if (conflicts.length) {
      skipped.push(conflicts[0])
      continue
    }
    working = [...working, { ...input, id: ++id, createdBy: user, createdAt: stamp, modifiedBy: user, modifiedAt: stamp }]
  }
  emit(working)
  return { copied: source.length - skipped.length, skipped }
}

export function periodInUse(periodId: number) {
  const count = entries.filter((e) => e.periodId === periodId).length
  return count ? `Used by ${count} routine class${count === 1 ? "" : "es"}.` : undefined
}

export function removeInstituteRoutine(instituteId: number) {
  emit(entries.filter((e) => e.instituteId !== instituteId))
}
