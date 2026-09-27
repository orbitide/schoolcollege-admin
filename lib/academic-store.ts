"use client"

import * as React from "react"

import type {
  AcademicRecord,
  AcademicSession,
  AcademicYear,
  Branch,
  HolidayEvent,
  LetterGrade,
  RecordStatus,
  ResultRemark,
  Shift,
  StudentCategory,
  StudentHouse,
} from "@/lib/institutes"

// In-memory dummy stores for per-institute ranked records (branches, shifts, …).
// Replace with API calls once the backend endpoints exist.
// Records are listed by rank unless a `sortKey` is given (e.g. a start date).
function createRecordStore<T extends AcademicRecord>(
  seed: T[],
  { sortKey }: { sortKey?: keyof T } = {}
) {
  let records = seed
  const listeners = new Set<() => void>()

  function emit(next: T[]) {
    records = next
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function useAll() {
    return React.useSyncExternalStore(
      subscribe,
      () => records,
      () => seed
    )
  }

  function forInstitute(all: T[], instituteId: number) {
    return all
      .filter((record) => record.instituteId === instituteId)
      .sort((a, b) =>
        sortKey
          ? String(a[sortKey]).localeCompare(String(b[sortKey])) ||
            a.rank - b.rank
          : a.rank - b.rank
      )
  }

  return {
    useList(instituteId: number) {
      const all = useAll()
      return React.useMemo(
        () => forInstitute(all, instituteId),
        [all, instituteId]
      )
    },
    useOne(id: number) {
      return useAll().find((record) => record.id === id)
    },
    add(input: Omit<T, "id" | "rank">) {
      const siblings = forInstitute(records, input.instituteId)
      const record = {
        ...input,
        id: Math.max(0, ...records.map((r) => r.id)) + 1,
        rank: Math.max(0, ...siblings.map((r) => r.rank)) + 1,
      } as T
      emit([...records, record])
      return record
    },
    update(id: number, input: Partial<Omit<T, "id" | "instituteId">>) {
      emit(records.map((r) => (r.id === id ? { ...r, ...input } : r)))
    },
    setStatus(id: number, status: RecordStatus) {
      emit(records.map((r) => (r.id === id ? { ...r, status } : r)))
    },
    remove(id: number) {
      emit(records.filter((r) => r.id !== id))
    },
    removeForInstitute(instituteId: number) {
      emit(records.filter((r) => r.instituteId !== instituteId))
    },
    // Swap rank with the neighbouring record in the same institute.
    move(id: number, direction: "up" | "down") {
      const record = records.find((r) => r.id === id)
      if (!record) return
      const siblings = forInstitute(records, record.instituteId)
      const index = siblings.findIndex((r) => r.id === id)
      const neighbour = siblings[direction === "up" ? index - 1 : index + 1]
      if (!neighbour) return
      emit(
        records.map((r) =>
          r.id === record.id
            ? { ...r, rank: neighbour.rank }
            : r.id === neighbour.id
              ? { ...r, rank: record.rank }
              : r
        )
      )
    },
    // Mark one record as the institute's current one (e.g. academic year).
    setCurrent(id: number) {
      const record = records.find((r) => r.id === id)
      if (!record) return
      emit(
        records.map((r) =>
          r.instituteId === record.instituteId
            ? { ...r, isCurrent: r.id === id }
            : r
        )
      )
    },
    // True when another record in the institute already uses this value.
    // `scope` narrows the check, e.g. { medium: "Bangla Medium" }.
    isTaken<K extends keyof T>(
      instituteId: number,
      key: K,
      value: string,
      exceptId?: number,
      scope: Partial<Record<keyof T, unknown>> = {}
    ) {
      const normalized = value.trim().toLowerCase()
      return records.some(
        (r) =>
          r.instituteId === instituteId &&
          r.id !== exceptId &&
          String(r[key]).trim().toLowerCase() === normalized &&
          Object.entries(scope).every(
            ([scopeKey, scopeValue]) => r[scopeKey as keyof T] === scopeValue
          )
      )
    },
  }
}

export const branchStore = createRecordStore<Branch>([
  {
    id: 1,
    instituteId: 1,
    name: "Main Campus",
    code: "MC",
    address: "10 Road 1, Dhaka",
    rank: 1,
    status: "Active",
  },
  {
    id: 2,
    instituteId: 1,
    name: "Uttara Branch",
    code: "UB",
    address: "Sector 7, Uttara, Dhaka",
    rank: 2,
    status: "Active",
  },
])

export const shiftStore = createRecordStore<Shift>([
  { id: 1, instituteId: 1, name: "Morning", rank: 1, status: "Active" },
  { id: 2, instituteId: 1, name: "Day", rank: 2, status: "Active" },
  { id: 3, instituteId: 2, name: "Morning", rank: 1, status: "Active" },
])

export const yearStore = createRecordStore<AcademicYear>([
  {
    id: 1,
    instituteId: 1,
    name: "2025",
    code: "25",
    isCurrent: false,
    rank: 1,
    status: "Active",
  },
  {
    id: 2,
    instituteId: 1,
    name: "2026",
    code: "26",
    isCurrent: true,
    rank: 2,
    status: "Active",
  },
  ...[2023, 2024, 2025, 2026].map((year, index) => ({
    id: 3 + index,
    instituteId: 5,
    name: String(year),
    code: String(year).slice(2),
    isCurrent: year === 2026,
    rank: index + 1,
    status: (year === 2023 ? "Inactive" : "Active") as RecordStatus,
  })),
])

export const sessionStore = createRecordStore<AcademicSession>([
  { id: 1, instituteId: 1, name: "2025-26", rank: 1, status: "Active" },
  ...["2023-24", "2024-25", "2025-26", "2026-27"].map((name, index) => ({
    id: 2 + index,
    instituteId: 5,
    name,
    rank: index + 1,
    status: (name === "2023-24" ? "Inactive" : "Active") as RecordStatus,
  })),
])

export const houseStore = createRecordStore<StudentHouse>(
  ["Red", "Blue", "Green", "Yellow"].map((color, index) => ({
    id: index + 1,
    instituteId: 1,
    name: `${color} House`,
    capacity: 0,
    rank: index + 1,
    status: "Active" as const,
  }))
)

export const categoryStore = createRecordStore<StudentCategory>([
  { id: 1, instituteId: 1, name: "General", rank: 1, status: "Active" },
  {
    id: 2,
    instituteId: 1,
    name: "Freedom Fighter Quota",
    rank: 2,
    status: "Active",
  },
])

const seedInstituteIds = [1, 5]

// Standard Bangladesh grading scale out of 5.
const gradeScale: [string, number, number, number][] = [
  ["A+", 80, 100, 5],
  ["A", 70, 79, 4],
  ["A-", 60, 69, 3.5],
  ["B", 50, 59, 3],
  ["C", 40, 49, 2],
  ["D", 33, 39, 1],
  ["F", 0, 32, 0],
]

export const letterGradeStore = createRecordStore<LetterGrade>(
  seedInstituteIds.flatMap((instituteId, i) =>
    gradeScale.map(([name, minMarks, maxMarks, gradePoint], index) => ({
      id: i * gradeScale.length + index + 1,
      instituteId,
      name,
      medium: "",
      minMarks,
      maxMarks,
      gradePoint,
      maxGradePoint: 5,
      rank: index + 1,
      status: "Active" as const,
    }))
  )
)

const remarkScale: Omit<ResultRemark, "id" | "instituteId" | "rank" | "status">[] = [
  { name: "Golden A+", minGpa: 5, maxGpa: 5, minMarks: 80, maxMarks: 100, basedOnGrading: true, isGolden: true, minFailCount: 0, maxFailCount: 0, medium: "" },
  { name: "Excellent", minGpa: 4.5, maxGpa: 4.99, minMarks: 70, maxMarks: 100, basedOnGrading: true, isGolden: false, minFailCount: 0, maxFailCount: 0, medium: "" },
  { name: "Very good", minGpa: 4, maxGpa: 4.49, minMarks: 60, maxMarks: 100, basedOnGrading: true, isGolden: false, minFailCount: 0, maxFailCount: 0, medium: "" },
  { name: "Good", minGpa: 3, maxGpa: 3.99, minMarks: 50, maxMarks: 100, basedOnGrading: true, isGolden: false, minFailCount: 0, maxFailCount: 0, medium: "" },
  { name: "Satisfactory", minGpa: 1, maxGpa: 2.99, minMarks: 33, maxMarks: 100, basedOnGrading: true, isGolden: false, minFailCount: 0, maxFailCount: 0, medium: "" },
  { name: "Fail", minGpa: 0, maxGpa: 0, minMarks: 0, maxMarks: 100, basedOnGrading: true, isGolden: false, minFailCount: 1, maxFailCount: 99, medium: "" },
]

export const resultRemarkStore = createRecordStore<ResultRemark>(
  seedInstituteIds.flatMap((instituteId, i) =>
    remarkScale.map((remark, index) => ({
      ...remark,
      id: i * remarkScale.length + index + 1,
      instituteId,
      rank: index + 1,
      status: "Active" as const,
    }))
  )
)

const holidaySeed: Omit<HolidayEvent, "id" | "instituteId" | "rank" | "status">[] = [
  { name: "International Mother Language Day", startDate: "2026-02-21", endDate: "2026-02-21", type: "Gazetted", repetition: "Yearly", description: "Shaheed Dibosh.", medium: "" },
  { name: "Independence Day", startDate: "2026-03-26", endDate: "2026-03-26", type: "Gazetted", repetition: "Yearly", description: "", medium: "" },
  { name: "Annual Sports", startDate: "2026-11-12", endDate: "2026-11-13", type: "Event", repetition: "Once", description: "Annual sports day on the school field.", medium: "" },
  { name: "Victory Day", startDate: "2026-12-16", endDate: "2026-12-16", type: "Gazetted", repetition: "Yearly", description: "", medium: "" },
  { name: "Winter vacation", startDate: "2026-12-20", endDate: "2026-12-31", type: "Management", repetition: "Yearly", description: "", medium: "" },
]

export const holidayStore = createRecordStore<HolidayEvent>(
  seedInstituteIds.flatMap((instituteId, i) =>
    holidaySeed.map((holiday, index) => ({
      ...holiday,
      id: i * holidaySeed.length + index + 1,
      instituteId,
      rank: index + 1,
      status: "Active" as const,
    }))
  ),
  { sortKey: "startDate" }
)

export function removeInstituteRecords(instituteId: number) {
  for (const store of [
    branchStore,
    shiftStore,
    yearStore,
    sessionStore,
    houseStore,
    categoryStore,
    letterGradeStore,
    resultRemarkStore,
    holidayStore,
  ]) {
    store.removeForInstitute(instituteId)
  }
}

export type RecordStore<T extends AcademicRecord> = ReturnType<
  typeof createRecordStore<T>
>
