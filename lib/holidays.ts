"use client"

import * as React from "react"

import type { HolidayEvent } from "@/lib/institutes"

// Legacy SchoolCollege HolidayAndEventSettings: an institute's holidays and
// events, for all of it or one medium and/or class. Ranked within that
// institute + medium + class scope. Deleting only marks it "Deleted" (it can
// be retrieved); a permanent delete removes it. In-memory like the rest of
// admin; replace with API calls once the backend endpoints exist.

export type HolidayInput = Pick<
  HolidayEvent,
  | "instituteId"
  | "medium"
  | "classId"
  | "name"
  | "startDate"
  | "endDate"
  | "type"
  | "repetition"
  | "description"
>

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-01-10T09:30:00.000Z"

const holidaySeed: Omit<HolidayInput, "instituteId">[] = [
  { name: "International Mother Language Day", startDate: "2026-02-21", endDate: "2026-02-21", type: "Gazetted", repetition: "Yearly", description: "Shaheed Dibosh.", medium: "", classId: null },
  { name: "Independence Day", startDate: "2026-03-26", endDate: "2026-03-26", type: "Gazetted", repetition: "Yearly", description: "", medium: "", classId: null },
  { name: "Annual Sports", startDate: "2026-11-12", endDate: "2026-11-13", type: "Event", repetition: "Once", description: "Annual sports day on the school field.", medium: "", classId: null },
  { name: "Victory Day", startDate: "2026-12-16", endDate: "2026-12-16", type: "Gazetted", repetition: "Yearly", description: "", medium: "", classId: null },
  { name: "Winter vacation", startDate: "2026-12-20", endDate: "2026-12-31", type: "Management", repetition: "Yearly", description: "", medium: "", classId: null },
]

let holidays: HolidayEvent[] = [1, 5].flatMap((instituteId, i) =>
  holidaySeed.map((holiday, index) => ({
    ...holiday,
    id: i * holidaySeed.length + index + 1,
    instituteId,
    rank: index + 1,
    status: "Active" as const,
    createdBy: seedUser,
    createdAt: seedStamp,
    modifiedBy: seedUser,
    modifiedAt: seedStamp,
  }))
)
const seed = holidays
const listeners = new Set<() => void>()

function emit(next: HolidayEvent[]) {
  holidays = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Every holiday of every institute, deleted ones included.
export function useAllHolidays() {
  return React.useSyncExternalStore(
    subscribe,
    () => holidays,
    () => seed
  )
}

export function useHoliday(id: number) {
  return useAllHolidays().find((h) => h.id === id)
}

function forInstitute(all: HolidayEvent[], instituteId: number) {
  return all
    .filter((h) => h.instituteId === instituteId && h.status !== "Deleted")
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.rank - b.rank)
}

// An institute's holidays that are not deleted, by start date, for the
// attendance sheets and reports.
export const holidayStore = {
  useList(instituteId: number) {
    const all = useAllHolidays()
    return React.useMemo(() => forInstitute(all, instituteId), [all, instituteId])
  },
  getList(instituteId: number) {
    return forInstitute(holidays, instituteId)
  },
}

type Scope = Pick<HolidayEvent, "instituteId" | "medium" | "classId">

const sameScope = (a: Scope, b: Scope) =>
  a.instituteId === b.instituteId && a.medium === b.medium && a.classId === b.classId

// The holidays holding a rank in the scope (every one not deleted).
function ranked(all: HolidayEvent[], scope: Scope) {
  return all.filter((h) => h.status !== "Deleted" && sameScope(h, scope))
}

export function maxHolidayRank(scope: Scope) {
  return Math.max(0, ...ranked(holidays, scope).map((h) => h.rank))
}

// The legacy duplicate check: one name per institute, medium and class.
export function isDuplicateHolidayName(input: HolidayInput, exceptId?: number) {
  const needle = input.name.trim().toLowerCase()
  return ranked(holidays, input).some(
    (h) => h.id !== exceptId && h.name.trim().toLowerCase() === needle
  )
}

// Close the gap a holiday leaves in its scope's ranks.
function withoutRank(all: HolidayEvent[], holiday: HolidayEvent) {
  return all.map((h) =>
    h.status !== "Deleted" && sameScope(h, holiday) && h.rank > holiday.rank
      ? { ...h, rank: h.rank - 1 }
      : h
  )
}

function clean(input: HolidayInput): HolidayInput {
  return { ...input, name: input.name.trim(), description: input.description.trim() }
}

// A new holiday goes last in its scope.
export function addHoliday(input: HolidayInput, user: string) {
  const stamp = now()
  const holiday: HolidayEvent = {
    ...clean(input),
    id: Math.max(0, ...holidays.map((h) => h.id)) + 1,
    rank: maxHolidayRank(input) + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...holidays, holiday])
  return holiday
}

function patch(id: number, changes: Partial<HolidayEvent>, user: string) {
  emit(
    holidays.map((h) =>
      h.id === id ? { ...h, ...changes, modifiedBy: user, modifiedAt: now() } : h
    )
  )
}

// Moving to another institute, medium or class puts it last there.
export function updateHoliday(id: number, input: HolidayInput, user: string) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday || holiday.status === "Deleted") return
  if (sameScope(holiday, input)) {
    patch(id, clean(input), user)
    return
  }
  emit(withoutRank(holidays, holiday))
  patch(id, { ...clean(input), rank: maxHolidayRank(input) + 1 }, user)
}

// Active ⇄ Inactive.
export function toggleHolidayStatus(id: number, user: string) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday || holiday.status === "Deleted") return
  patch(id, { status: holiday.status === "Active" ? "Inactive" : "Active" }, user)
}

// Soft delete; the legacy "Retrieve" brings it back as active, last in rank.
export function deleteHoliday(id: number, user: string) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday || holiday.status === "Deleted") return
  emit(withoutRank(holidays, holiday))
  patch(id, { status: "Deleted" }, user)
}

export function retrieveHoliday(id: number, user: string) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday || holiday.status !== "Deleted") return
  patch(id, { status: "Active", rank: maxHolidayRank(holiday) + 1 }, user)
}

export function deleteHolidayPermanently(id: number) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday) return
  const rest = holidays.filter((h) => h.id !== id)
  emit(holiday.status === "Deleted" ? rest : withoutRank(rest, holiday))
}

// Legacy UpdateRank: move the holiday to `newRank` (1..max) within its scope,
// shifting the holidays in between by one.
export function setHolidayRank(id: number, newRank: number, user: string) {
  const holiday = holidays.find((h) => h.id === id)
  if (!holiday || holiday.status === "Deleted") return
  const old = holiday.rank
  if (newRank === old) return
  const [low, high, step] = newRank < old ? [newRank, old - 1, 1] : [old + 1, newRank, -1]
  const stamp = now()
  emit(
    holidays.map((h) => {
      if (h.id === id) return { ...h, rank: newRank, modifiedBy: user, modifiedAt: stamp }
      if (h.status !== "Deleted" && sameScope(h, holiday) && h.rank >= low && h.rank <= high) {
        return { ...h, rank: h.rank + step }
      }
      return h
    })
  )
}

export function removeInstituteHolidays(instituteId: number) {
  emit(holidays.filter((h) => h.instituteId !== instituteId))
}

// Date helpers for holiday lists and forms.

export const jsWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// "21 Feb 2026", or "20 Dec – 31 Dec 2026" for a range.
export function formatDateRange(start: string, end: string) {
  const format = (value: string, withYear: boolean) =>
    parseIsoDate(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear && { year: "numeric" }),
    })
  if (!end || start === end) return format(start, true)
  return `${format(start, start.slice(0, 4) !== end.slice(0, 4))} – ${format(end, true)}`
}

export function dayCount(start: string, end: string) {
  const days =
    Math.round(
      (parseIsoDate(end || start).getTime() - parseIsoDate(start).getTime()) / 86_400_000
    ) + 1
  return `${days} day${days === 1 ? "" : "s"}`
}
