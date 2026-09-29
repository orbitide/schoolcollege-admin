"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { roundMoney } from "@/lib/fee-heads"
import {
  allocate,
  getFeePayments,
  openLines,
  recordPayment,
  type FeePayment,
  type OnlineGateway,
} from "@/lib/fee-payments"
import { getFeeInvoices } from "@/lib/fee-invoices"

// Online fee payments through bKash, Nagad or SSLCommerz, as a SANDBOX: no
// real gateway is called. The flow follows the plan's rules
// (05-fees-finance/collection-and-bd-payments.md) so the real integration
// only swaps the two gateway calls:
//   1. The school makes a payment request for a student's dues; it has a
//      unique id and expires after 30 minutes.
//   2. The guardian opens the checkout page (/pay/<id>) and pays there.
//   3. The gateway's answer is only a claim: the request goes "Processing"
//      and the server verifies the transaction (simulated) before anything
//      is recorded. The browser return alone never marks a due paid.
//   4. A verified payment is recorded once (lib/fee-payments.ts, source
//      Online) and receipted; failed, cancelled and expired requests stay
//      listed for follow-up.
// In-memory like the rest of admin; replace with API calls once a gateway
// is chosen and the backend endpoints exist.

export const onlinePaymentStatuses = ["Initiated", "Processing", "Success", "Failed", "Cancelled", "Expired"] as const
export type OnlinePaymentStatus = (typeof onlinePaymentStatuses)[number]

export const REQUEST_MINUTES = 30
// Sandbox checkout: this PIN / OTP pays, anything else is declined.
export const SANDBOX_PIN = "12345"

export type OnlinePayment = {
  id: number
  instituteId: number
  studentId: number
  // Opaque id the checkout link carries (the gateway's payment id).
  token: string
  gateway: OnlineGateway | null
  amount: number
  // The invoices the request pays, oldest first; the amount is allocated
  // to their lines when it is recorded.
  invoiceIds: number[]
  status: OnlinePaymentStatus
  // Set by the gateway: the payer's wallet (masked) and its transaction id.
  payerAccount: string
  trxId: string
  // What verification decided; kept apart from what the browser was told.
  failureReason: string
  paymentId: number | null
  createdBy: string
  createdAt: string
  expiresAt: string
  updatedAt: string
}

const seedStamp = "2026-09-20T09:00:00.000Z"

// A few requests of institute 1 so the list isn't empty: one expired
// without being opened, one declined at the gateway.
const seed: OnlinePayment[] = [
  { id: 1, instituteId: 1, studentId: 7, token: "SBX7Q2M9K1", gateway: null, amount: 1100, invoiceIds: [], status: "Expired", payerAccount: "", trxId: "", failureReason: "Not paid within 30 minutes.", paymentId: null, createdBy: "Super Admin", createdAt: seedStamp, expiresAt: "2026-09-20T09:30:00.000Z", updatedAt: seedStamp },
  { id: 2, instituteId: 1, studentId: 14, token: "SBX4H8T3D6", gateway: "Nagad", amount: 1150, invoiceIds: [], status: "Failed", payerAccount: "017•••••321", trxId: "", failureReason: "Wrong PIN at the gateway.", paymentId: null, createdBy: "Super Admin", createdAt: "2026-09-22T11:10:00.000Z", expiresAt: "2026-09-22T11:40:00.000Z", updatedAt: "2026-09-22T11:12:00.000Z" },
]

let requests: OnlinePayment[] = seed
const listeners = new Set<() => void>()

function emit(next: OnlinePayment[]) {
  logChanges("OnlinePayment", requests, next, (r) => r.token)
  requests = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOnlinePayments() {
  return React.useSyncExternalStore(subscribe, () => requests, () => seed)
}

export function useOnlinePaymentByToken(token: string) {
  return useOnlinePayments().find((r) => r.token === token)
}

// An open request past its time counts as expired.
export function effectiveStatus(request: OnlinePayment, now = Date.now()): OnlinePaymentStatus {
  if (request.status === "Initiated" && Date.parse(request.expiresAt) < now) return "Expired"
  return request.status
}

function newToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let token = "SBX"
  for (let i = 0; i < 7; i++) token += chars[Math.floor(Math.random() * chars.length)]
  return token
}

function patch(id: number, changes: Partial<OnlinePayment>) {
  emit(requests.map((r) => (r.id === id ? { ...r, ...changes, updatedAt: new Date().toISOString() } : r)))
}

// Step 1: a request for `amount` of the student's dues (all of them when
// not given), for the counter to share as a link.
export function createPaymentRequest(instituteId: number, studentId: number, amount: number, user: string) {
  const lines = openLines(getFeeInvoices(), getFeePayments(), studentId)
  const due = roundMoney(lines.reduce((sum, l) => sum + l.due, 0))
  const value = roundMoney(amount)
  if (!(due > 0)) throw new Error("The student has no dues to pay.")
  if (!(value > 0)) throw new Error("Enter the amount to pay.")
  if (value > due) throw new Error(`The student owes only ${due}.`)
  const { allocations } = allocate(lines, value)
  const now = new Date()
  const request: OnlinePayment = {
    id: Math.max(0, ...requests.map((r) => r.id)) + 1,
    instituteId,
    studentId,
    token: newToken(),
    gateway: null,
    amount: value,
    invoiceIds: [...new Set(allocations.map((a) => a.invoiceId))],
    status: "Initiated",
    payerAccount: "",
    trxId: "",
    failureReason: "",
    paymentId: null,
    createdBy: user,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REQUEST_MINUTES * 60_000).toISOString(),
    updatedAt: now.toISOString(),
  }
  emit([...requests, request])
  return request
}

const mask = (account: string) => {
  const digits = account.replace(/\D/g, "")
  return digits.length > 6 ? `${digits.slice(0, 3)}•••••${digits.slice(-3)}` : "•••"
}

// Step 2 (checkout page): the payer confirms at the gateway. The sandbox
// declines any PIN but SANDBOX_PIN. Either way the request only moves to
// Processing or Failed here; nothing is recorded until verification.
export function submitCheckout(token: string, gateway: OnlineGateway, account: string, pin: string) {
  const request = requests.find((r) => r.token === token)
  if (!request) throw new Error("Payment request not found.")
  const status = effectiveStatus(request)
  if (status !== "Initiated") throw new Error(`This payment request is ${status.toLowerCase()}.`)
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(account.replace(/[\s-]/g, "")) && gateway !== "SSLCommerz") {
    throw new Error(`Enter a valid ${gateway} account number.`)
  }
  if (pin !== SANDBOX_PIN) {
    patch(request.id, { gateway, payerAccount: mask(account), status: "Failed", failureReason: "Wrong PIN at the gateway." })
    return "Failed" as const
  }
  patch(request.id, {
    gateway,
    payerAccount: gateway === "SSLCommerz" ? "Card •••• 4242" : mask(account),
    // What the gateway would return; verified in step 3 before it counts.
    trxId: `${gateway.slice(0, 2).toUpperCase()}${Date.now().toString(36).toUpperCase()}`,
    status: "Processing",
  })
  return "Processing" as const
}

export function cancelCheckout(token: string) {
  const request = requests.find((r) => r.token === token)
  if (!request || effectiveStatus(request) !== "Initiated") return
  patch(request.id, { status: "Cancelled", failureReason: "Cancelled by the payer." })
}

// Step 3 (server): verifies a Processing request with the gateway
// (simulated: the transaction id it got is taken as genuine) and records
// the payment once. Safe to run twice: a recorded request just returns its
// payment. `user` is who the receipt is stamped with.
export function verifyOnlinePayment(id: number, user: string): FeePayment | null {
  const request = requests.find((r) => r.id === id)
  if (!request) throw new Error("Payment request not found.")
  if (request.paymentId != null) return getFeePayments().find((p) => p.id === request.paymentId) ?? null
  if (request.status !== "Processing" || !request.gateway) {
    throw new Error("Only a payment the gateway has accepted can be verified.")
  }
  const lines = openLines(getFeeInvoices(), getFeePayments(), request.studentId)
  const { allocations, left } = allocate(lines, request.amount)
  if (left > 0) {
    // The dues were paid another way meanwhile: the money needs a refund,
    // not a receipt.
    patch(id, { status: "Failed", failureReason: `Verified, but ${left} of it is no longer due. Refund it at the gateway.` })
    return null
  }
  const payment = recordPayment(
    {
      instituteId: request.instituteId,
      studentId: request.studentId,
      paidOn: new Date().toISOString().slice(0, 10),
      method: request.gateway,
      reference: request.trxId,
      note: `Online payment ${request.token}`,
      allocations,
      source: "Online",
      onlinePaymentId: request.id,
    },
    user
  )
  patch(id, { status: "Success", paymentId: payment.id })
  return payment
}

export function removeInstituteOnlinePayments(instituteId: number) {
  emit(requests.filter((r) => r.instituteId !== instituteId))
}
