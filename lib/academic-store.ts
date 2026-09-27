"use client"

import * as React from "react"

import type {
  AcademicRecord,
  Branch,
  RecordStatus,
  Shift,
} from "@/lib/institutes"

// In-memory dummy stores for per-institute ranked records (branches, shifts).
// Replace with API calls once the backend endpoints exist.
function createRecordStore<T extends AcademicRecord>(seed: T[]) {
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
      .sort((a, b) => a.rank - b.rank)
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
    // True when another record in the institute already uses this value.
    isTaken<K extends keyof T>(
      instituteId: number,
      key: K,
      value: string,
      exceptId?: number
    ) {
      const normalized = value.trim().toLowerCase()
      return records.some(
        (r) =>
          r.instituteId === instituteId &&
          r.id !== exceptId &&
          String(r[key]).trim().toLowerCase() === normalized
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

export type RecordStore<T extends AcademicRecord> = ReturnType<
  typeof createRecordStore<T>
>
