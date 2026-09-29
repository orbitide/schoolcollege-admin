"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Student fee waivers (scholarships, sibling, staff-child, poor-fund
// discounts): a percentage off one fee head for one student in an academic
// year, with the reason it was given. Generate Dues takes it off each line
// it bills. A waiver changes future dues only; dues already generated keep
// the waiver they were billed with.
// In-memory like the rest of admin; replace with API calls once the backend
// endpoints exist.

export const waiverReasons = [
  "Merit Scholarship",
  "Sibling Discount",
  "Staff Child",
  "Poor Fund",
  "Freedom Fighter Quota",
  "Other",
] as const
export type WaiverReason = (typeof waiverReasons)[number]

export type FeeWaiver = {
  id: number
  instituteId: number
  yearId: number
  studentId: number
  feeHeadId: number
  // 1–100.
  percent: number
  reason: WaiverReason
  note: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const seedUser = "Super Admin"
const seedStamp = "2026-01-03T09:00:00.000Z"

// A few institute 1 students in 2026: two scholarships on tuition, one
// sibling discount.
const seed: FeeWaiver[] = [
  { id: 1, instituteId: 1, yearId: 2, studentId: 3, feeHeadId: 1, percent: 100, reason: "Merit Scholarship", note: "First in Class Five final.", createdBy: seedUser, createdAt: seedStamp, modifiedBy: seedUser, modifiedAt: seedStamp },
  { id: 2, instituteId: 1, yearId: 2, studentId: 8, feeHeadId: 1, percent: 50, reason: "Sibling Discount", note: "Elder brother in Class Nine.", createdBy: seedUser, createdAt: seedStamp, modifiedBy: seedUser, modifiedAt: seedStamp },
  { id: 3, instituteId: 1, yearId: 2, studentId: 20, feeHeadId: 1, percent: 25, reason: "Poor Fund", note: "", createdBy: seedUser, createdAt: seedStamp, modifiedBy: seedUser, modifiedAt: seedStamp },
]

let waivers: FeeWaiver[] = seed
const listeners = new Set<() => void>()

function emit(next: FeeWaiver[]) {
  logChanges("FeeWaiver", waivers, next)
  waivers = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFeeWaivers() {
  return React.useSyncExternalStore(subscribe, () => waivers, () => seed)
}

export function getFeeWaivers() {
  return waivers
}

// The percentage waived off the head for the student in the year (0 when none).
export function waiverPercent(all: FeeWaiver[], yearId: number, studentId: number, feeHeadId: number) {
  return all.find((w) => w.yearId === yearId && w.studentId === studentId && w.feeHeadId === feeHeadId)?.percent ?? 0
}

export type WaiverInput = { percent: number; reason: WaiverReason; note: string }

// Sets the students' waivers on one head for the year: a percent above 0
// adds or updates, 0 removes. Returns how many were changed.
export function saveWaivers(
  instituteId: number,
  yearId: number,
  feeHeadId: number,
  changes: Record<number, WaiverInput>,
  user: string
) {
  const stamp = new Date().toISOString()
  let id = Math.max(0, ...waivers.map((w) => w.id))
  let changed = 0
  const touched = new Set<number>()
  const next: FeeWaiver[] = []
  for (const w of waivers) {
    const change =
      w.instituteId === instituteId && w.yearId === yearId && w.feeHeadId === feeHeadId
        ? changes[w.studentId]
        : undefined
    if (!change) {
      next.push(w)
      continue
    }
    touched.add(w.studentId)
    if (!(change.percent > 0)) {
      changed++
      continue
    }
    const note = change.note.trim()
    if (w.percent === change.percent && w.reason === change.reason && w.note === note) {
      next.push(w)
      continue
    }
    changed++
    next.push({ ...w, percent: change.percent, reason: change.reason, note, modifiedBy: user, modifiedAt: stamp })
  }
  for (const [student, change] of Object.entries(changes)) {
    const studentId = Number(student)
    if (touched.has(studentId) || !(change.percent > 0)) continue
    changed++
    next.push({
      id: ++id,
      instituteId,
      yearId,
      studentId,
      feeHeadId,
      percent: change.percent,
      reason: change.reason,
      note: change.note.trim(),
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    })
  }
  if (changed) emit(next)
  return changed
}

export function removeInstituteWaivers(instituteId: number) {
  emit(waivers.filter((w) => w.instituteId !== instituteId))
}
