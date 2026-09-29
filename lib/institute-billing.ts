"use client"

import * as React from "react"

import {
  billableStudents,
  monthlyCharge,
  perStudentRate,
  ratesFor,
  useBillingSettings,
  type Rates,
} from "@/lib/billing"
import type { Institute } from "@/lib/institutes"
import { invoiceState, useSaasInvoices, type SaasInvoice } from "@/lib/saas-invoices"
import { useSubscriptions } from "@/lib/subscriptions"

// What an institute would be billed if the month closed now.
export type InstituteBill = {
  students: number
  rates: Rates & { custom: boolean }
  rate: number
  amount: number
}

// Works out any institute's bill at today's student count, rates and
// custom prices. Trial and suspended institutes aren't billed.
export function useBillOf() {
  const settings = useBillingSettings()
  const subscriptions = useSubscriptions()
  return React.useCallback(
    (institute: Institute): InstituteBill => {
      const rates = ratesFor(
        subscriptions.find((s) => s.instituteId === institute.id),
        settings
      )
      const students = billableStudents(institute)
      return {
        students,
        rates,
        rate: perStudentRate(students, rates, settings.threshold),
        amount: institute.status === "Active" ? monthlyCharge(students, rates, settings.threshold) : 0,
      }
    },
    [settings, subscriptions]
  )
}

export type InvoiceTotals = {
  due: number
  overdue: number
  dueCount: number
  overdueCount: number
}

// Unpaid invoices per institute: what's due and what's past its due date.
export function useOutstanding() {
  const invoices = useSaasInvoices()
  return React.useMemo(() => {
    const byInstitute = new Map<number, InvoiceTotals>()
    for (const invoice of invoices) {
      const state = invoiceState(invoice)
      if (state !== "Due" && state !== "Overdue") continue
      const t = byInstitute.get(invoice.instituteId) ?? { due: 0, overdue: 0, dueCount: 0, overdueCount: 0 }
      if (state === "Overdue") {
        t.overdue += invoice.amount
        t.overdueCount++
      } else {
        t.due += invoice.amount
        t.dueCount++
      }
      byInstitute.set(invoice.instituteId, t)
    }
    return byInstitute
  }, [invoices])
}

// Each institute's latest invoice.
export function latestInvoices(invoices: SaasInvoice[]) {
  const latest = new Map<number, SaasInvoice>()
  for (const invoice of invoices) {
    const current = latest.get(invoice.instituteId)
    if (!current || invoice.month > current.month) latest.set(invoice.instituteId, invoice)
  }
  return latest
}
