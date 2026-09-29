"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { roundMoney } from "@/lib/fee-heads"

// Class fee setup: how much each fee head costs a class in an academic year
// (for a Per Absent Day head, the fine per day). A head without an amount
// isn't billed to that class. Saved a class at a time from Fee Setup.
// In-memory like the rest of admin; replace with API calls once the backend
// endpoints exist.

export type ClassFee = {
  id: number
  instituteId: number
  yearId: number
  classId: number
  feeHeadId: number
  amount: number
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const seedUser = "Super Admin"
const seedStamp = "2026-01-02T09:00:00.000Z"

// Institute 1, 2026 (year 2): tuition rises by class; heads 1–6 as seeded in
// lib/fee-heads.ts.
function seedFees(): ClassFee[] {
  const rows: Omit<ClassFee, "id">[] = []
  for (let classId = 1; classId <= 5; classId++) {
    const amounts: [number, number][] = [
      [1, 800 + classId * 100],
      [2, classId >= 4 ? 200 : 150],
      [3, 5000],
      [4, 3000],
      [5, 500],
      [6, 20],
    ]
    for (const [feeHeadId, amount] of amounts) {
      rows.push({
        instituteId: 1,
        yearId: 2,
        classId,
        feeHeadId,
        amount,
        createdBy: seedUser,
        createdAt: seedStamp,
        modifiedBy: seedUser,
        modifiedAt: seedStamp,
      })
    }
  }
  return rows.map((row, index) => ({ ...row, id: index + 1 }))
}

const seed = seedFees()
let fees: ClassFee[] = seed
const listeners = new Set<() => void>()

function emit(next: ClassFee[]) {
  logChanges("ClassFee", fees, next)
  fees = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useClassFees() {
  return React.useSyncExternalStore(subscribe, () => fees, () => seed)
}

export function getClassFees() {
  return fees
}

// The class's amount for a head in the year; 0 when none is set.
export function classFeeAmount(
  all: ClassFee[],
  yearId: number,
  classId: number,
  feeHeadId: number
) {
  return all.find((f) => f.yearId === yearId && f.classId === classId && f.feeHeadId === feeHeadId)?.amount ?? 0
}

// Saves a class's amounts for the year: a positive amount adds or updates
// the head, 0 (or blank) removes it. Returns how many heads have an amount.
export function saveClassFees(
  instituteId: number,
  yearId: number,
  classId: number,
  amounts: Record<number, number>,
  user: string
) {
  const stamp = new Date().toISOString()
  let id = Math.max(0, ...fees.map((f) => f.id))
  const mine = (f: ClassFee) => f.instituteId === instituteId && f.yearId === yearId && f.classId === classId
  const next: ClassFee[] = []
  for (const fee of fees) {
    if (!mine(fee)) {
      next.push(fee)
      continue
    }
    const amount = roundMoney(amounts[fee.feeHeadId] ?? fee.amount)
    if (!(amount > 0)) continue
    next.push(amount === fee.amount ? fee : { ...fee, amount, modifiedBy: user, modifiedAt: stamp })
  }
  for (const [head, raw] of Object.entries(amounts)) {
    const feeHeadId = Number(head)
    const amount = roundMoney(raw)
    if (!(amount > 0) || fees.some((f) => mine(f) && f.feeHeadId === feeHeadId)) continue
    next.push({
      id: ++id,
      instituteId,
      yearId,
      classId,
      feeHeadId,
      amount,
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    })
  }
  emit(next)
  return next.filter(mine).length
}

// Copies one class's amounts onto others of the same year, replacing theirs.
export function copyClassFees(
  instituteId: number,
  yearId: number,
  fromClassId: number,
  toClassIds: number[],
  user: string
) {
  const source = fees.filter(
    (f) => f.instituteId === instituteId && f.yearId === yearId && f.classId === fromClassId
  )
  const amounts = Object.fromEntries(source.map((f) => [f.feeHeadId, f.amount]))
  for (const classId of toClassIds) {
    const current = fees.filter(
      (f) => f.instituteId === instituteId && f.yearId === yearId && f.classId === classId
    )
    // Heads the source doesn't charge are cleared on the target.
    const cleared = Object.fromEntries(current.map((f) => [f.feeHeadId, 0]))
    saveClassFees(instituteId, yearId, classId, { ...cleared, ...amounts }, user)
  }
}

export function feeHeadInUse(feeHeadId: number) {
  return fees.some((f) => f.feeHeadId === feeHeadId)
}

export function removeInstituteClassFees(instituteId: number) {
  emit(fees.filter((f) => f.instituteId !== instituteId))
}
