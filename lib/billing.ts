"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { Institute } from "@/lib/institutes"

// Platform pricing: one plan with every feature and no limits, charged per
// active student each month. The whole count is charged one rate: below
// the threshold every student pays the lower rate, at or above it every
// student pays the upper rate. An institute's subscription may override
// either rate. Amounts are in Taka.

export type BillingSettings = {
  id: number
  // Students from which the upper rate applies.
  threshold: number
  lowerRate: number
  upperRate: number
  // Length of a new institute's free trial.
  trialDays: number
  // Days after issue an invoice falls due.
  invoiceDueDays: number
  modifiedBy: string
  modifiedAt: string
}

export type BillingSettingsInput = Pick<
  BillingSettings,
  "threshold" | "lowerRate" | "upperRate" | "trialDays" | "invoiceDueDays"
>

const seed: BillingSettings = {
  id: 1,
  threshold: 1000,
  lowerRate: 20,
  upperRate: 15,
  trialDays: 30,
  invoiceDueDays: 10,
  modifiedBy: "Super Admin",
  modifiedAt: "2026-01-01T00:00:00.000Z",
}

let settings = seed
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBillingSettings() {
  return settings
}

export function useBillingSettings() {
  return React.useSyncExternalStore(subscribe, () => settings, () => seed)
}

export function billingSettingsErrors(input: BillingSettingsInput) {
  const errors: Partial<Record<keyof BillingSettingsInput, string>> = {}
  const whole = (n: number) => Number.isInteger(n) && n > 0
  if (!whole(input.threshold)) errors.threshold = "Enter a whole number of students above 0."
  if (!(input.lowerRate >= 0)) errors.lowerRate = "Enter a rate of 0 or more."
  if (!(input.upperRate >= 0)) errors.upperRate = "Enter a rate of 0 or more."
  if (!whole(input.trialDays)) errors.trialDays = "Enter a whole number of days above 0."
  if (!whole(input.invoiceDueDays)) errors.invoiceDueDays = "Enter a whole number of days above 0."
  return errors
}

export function updateBillingSettings(input: BillingSettingsInput, user: string) {
  const next = { ...settings, ...input, modifiedBy: user, modifiedAt: new Date().toISOString() }
  logChanges("BillingSetting", [settings], [next])
  settings = next
  listeners.forEach((listener) => listener())
}

// ---- Pricing ----

export type Rates = { lowerRate: number; upperRate: number }

// The rate every student is charged at this count.
export function perStudentRate(count: number, rates: Rates, threshold: number) {
  return count < threshold ? rates.lowerRate : rates.upperRate
}

export function monthlyCharge(count: number, rates: Rates, threshold: number) {
  return count * perStudentRate(count, rates, threshold)
}

// An institute's rates: its own where set, else the platform's.
export function ratesFor(
  custom: { customLowerRate: number | null; customUpperRate: number | null } | undefined,
  defaults: Rates
): Rates & { custom: boolean } {
  const lowerRate = custom?.customLowerRate ?? defaults.lowerRate
  const upperRate = custom?.customUpperRate ?? defaults.upperRate
  return {
    lowerRate,
    upperRate,
    custom: custom?.customLowerRate != null || custom?.customUpperRate != null,
  }
}

// The active students an institute is billed for. Until the API counts
// active students at month end, it's the count the platform keeps on the
// institute.
export function billableStudents(institute: Pick<Institute, "students">) {
  return institute.students
}

export function formatTaka(amount: number) {
  return `৳${Math.round(amount).toLocaleString()}`
}

// ---- Months ----

const pad = (n: number) => String(n).padStart(2, "0")

// "2026-09" for the month `offset` months from this one (negative is past).
export function monthOf(offset = 0, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// The last day of a "YYYY-MM" month, as ISO.
export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number)
  return `${month}-${pad(new Date(y, m, 0).getDate())}`
}

export function monthName(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDaysIso(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number)
  return isoDate(new Date(y, m - 1, d + days))
}
