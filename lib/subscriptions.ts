"use client"

import * as React from "react"

import { addDaysIso, getBillingSettings, isoDate } from "@/lib/billing"
import { logChanges } from "@/lib/common-log"
import { seedInstitutes, type Institute } from "@/lib/institutes"

// An institute's subscription to the platform: when it started, when its
// trial ends, and any rates agreed for it alone (null keeps the platform's
// rate). Whether it's active, on trial or suspended is the institute's
// status. One per institute.
export type Subscription = {
  id: number
  instituteId: number
  startedAt: string
  // ISO date; null once the institute is no longer on trial.
  trialEndsAt: string | null
  customLowerRate: number | null
  customUpperRate: number | null
  notes: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

const SEED_USER = "Super Admin"
const SEED_STAMP = "2026-01-01T00:00:00.000Z"

// Rates agreed with a couple of seed institutes.
const seedRates: Record<number, Pick<Subscription, "customLowerRate" | "customUpperRate" | "notes">> = {
  7: { customLowerRate: null, customUpperRate: 12, notes: "Three-year agreement, 20% off the upper rate." },
  12: { customLowerRate: 18, customUpperRate: 13, notes: "Group discount with sister institutes." },
}

function seedSubscriptions(): Subscription[] {
  const today = isoDate()
  return seedInstitutes.map((institute, index) => ({
    id: index + 1,
    instituteId: institute.id,
    startedAt: institute.joinedAt,
    // Spread the trials out so some end within the week.
    trialEndsAt: institute.status === "Trial" ? addDaysIso(today, 3 + ((institute.id * 7) % 25)) : null,
    ...(seedRates[institute.id] ?? { customLowerRate: null, customUpperRate: null, notes: "" }),
    createdBy: SEED_USER,
    createdAt: SEED_STAMP,
    modifiedBy: SEED_USER,
    modifiedAt: SEED_STAMP,
  }))
}

const seed = seedSubscriptions()
let subscriptions = seed
const listeners = new Set<() => void>()

function emit(next: Subscription[]) {
  logChanges("Subscription", subscriptions, next)
  subscriptions = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSubscriptions() {
  return subscriptions
}

export function useSubscriptions() {
  return React.useSyncExternalStore(subscribe, () => subscriptions, () => seed)
}

export function useSubscription(instituteId: number) {
  return useSubscriptions().find((s) => s.instituteId === instituteId)
}

function patch(instituteId: number, changes: Partial<Subscription>, user: string) {
  emit(
    subscriptions.map((s) =>
      s.instituteId === instituteId
        ? { ...s, ...changes, modifiedBy: user, modifiedAt: new Date().toISOString() }
        : s
    )
  )
}

// A new institute's subscription, starting its trial today when it joins
// on trial.
export function addSubscription(institute: Pick<Institute, "id" | "status" | "joinedAt">, user: string) {
  const now = new Date().toISOString()
  emit([
    ...subscriptions,
    {
      id: Math.max(0, ...subscriptions.map((s) => s.id)) + 1,
      instituteId: institute.id,
      startedAt: institute.joinedAt,
      trialEndsAt:
        institute.status === "Trial" ? addDaysIso(isoDate(), getBillingSettings().trialDays) : null,
      customLowerRate: null,
      customUpperRate: null,
      notes: "",
      createdBy: user,
      createdAt: now,
      modifiedBy: user,
      modifiedAt: now,
    },
  ])
}

export function removeInstituteSubscription(instituteId: number) {
  if (subscriptions.some((s) => s.instituteId === instituteId)) {
    emit(subscriptions.filter((s) => s.instituteId !== instituteId))
  }
}

export type CustomRatesInput = Pick<Subscription, "customLowerRate" | "customUpperRate" | "notes">

export function customRatesErrors(input: CustomRatesInput) {
  const errors: Partial<Record<keyof CustomRatesInput, string>> = {}
  if (input.customLowerRate != null && !(input.customLowerRate >= 0))
    errors.customLowerRate = "Enter a rate of 0 or more, or leave it blank."
  if (input.customUpperRate != null && !(input.customUpperRate >= 0))
    errors.customUpperRate = "Enter a rate of 0 or more, or leave it blank."
  return errors
}

export function setCustomRates(instituteId: number, input: CustomRatesInput, user: string) {
  patch(instituteId, input, user)
}

// Push the trial's end back by `days` (from today if it has already ended).
export function extendTrial(instituteId: number, days: number, user: string) {
  const sub = subscriptions.find((s) => s.instituteId === instituteId)
  const today = isoDate()
  const from = sub?.trialEndsAt && sub.trialEndsAt > today ? sub.trialEndsAt : today
  patch(instituteId, { trialEndsAt: addDaysIso(from, days) }, user)
}

export function endTrial(instituteId: number, user: string) {
  patch(instituteId, { trialEndsAt: null }, user)
}
