"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { Institute } from "@/lib/institutes"

// An institute's billing details: the "Bill to" on the platform's invoices.
// The institute keeps them (Billing), and the platform can correct them
// (Subscriptions). A blank field falls back to the institute's profile, so
// institutes that never fill this in still get a proper invoice. Invoices
// copy the result when issued. In-memory like the rest of admin.

export type BillingProfile = {
  id: number
  instituteId: number
  billingName: string
  contactPerson: string
  email: string
  phone: string
  address: string
  // Bangladesh VAT registration (BIN), for the institute's accounts.
  bin: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type BillingProfileInput = Pick<
  BillingProfile,
  "billingName" | "contactPerson" | "email" | "phone" | "address" | "bin"
>

// What an invoice prints under "Bill to".
export type BillTo = BillingProfileInput

let profiles: BillingProfile[] = []
const empty: BillingProfile[] = []
const listeners = new Set<() => void>()

function emit(next: BillingProfile[]) {
  logChanges("InstituteBillingProfile", profiles, next)
  profiles = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBillingProfile(instituteId: number) {
  const all = React.useSyncExternalStore(subscribe, () => profiles, () => empty)
  return all.find((p) => p.instituteId === instituteId)
}

export function getBillingProfile(instituteId: number) {
  return profiles.find((p) => p.instituteId === instituteId)
}

export const blankBillingProfile: BillingProfileInput = {
  billingName: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  bin: "",
}

// The institute's profile values a blank field falls back to.
export function billingFallback(institute: Institute): BillTo {
  return {
    billingName: institute.name,
    contactPerson: institute.principal || institute.manager,
    email: institute.email,
    phone: institute.phone,
    address: [institute.address, institute.city].filter(Boolean).join(", "),
    bin: "",
  }
}

// The details an invoice issued now would carry.
export function billToOf(institute: Institute, profile: BillingProfile | undefined): BillTo {
  const fallback = billingFallback(institute)
  const pick = (key: keyof BillTo) => profile?.[key] || fallback[key]
  return {
    billingName: pick("billingName"),
    contactPerson: pick("contactPerson"),
    email: pick("email"),
    phone: pick("phone"),
    address: pick("address"),
    bin: pick("bin"),
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^(?:\+?88)?01[3-9]\d{8}$/

// Every field may be blank (the profile fills in); what's given must be valid.
export function billingProfileErrors(input: BillingProfileInput) {
  const errors: Partial<Record<keyof BillingProfileInput, string>> = {}
  if (input.email.trim() && !EMAIL.test(input.email.trim())) errors.email = "Enter a valid email address."
  if (input.phone.trim() && !PHONE.test(input.phone.trim())) errors.phone = "Enter a mobile number like 01XXXXXXXXX."
  if (input.bin.trim() && !/^[\d-]{9,15}$/.test(input.bin.trim())) errors.bin = "Enter the BIN's digits, like 000123456-0101."
  return errors
}

export function saveBillingProfile(instituteId: number, input: BillingProfileInput, user: string) {
  const now = new Date().toISOString()
  const values = {
    billingName: input.billingName.trim(),
    contactPerson: input.contactPerson.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    bin: input.bin.trim(),
  }
  const existing = getBillingProfile(instituteId)
  emit(
    existing
      ? profiles.map((p) => (p.id === existing.id ? { ...p, ...values, modifiedBy: user, modifiedAt: now } : p))
      : [
          ...profiles,
          {
            id: Math.max(0, ...profiles.map((p) => p.id)) + 1,
            instituteId,
            ...values,
            createdBy: user,
            createdAt: now,
            modifiedBy: user,
            modifiedAt: now,
          },
        ]
  )
}

export function removeInstituteBillingProfile(instituteId: number) {
  if (profiles.some((p) => p.instituteId === instituteId)) emit(profiles.filter((p) => p.instituteId !== instituteId))
}
