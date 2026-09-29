"use client"

import { createRecordStore } from "@/lib/academic-store"
import type { AcademicRecord } from "@/lib/institutes"

// What an institute charges for (tuition, admission, session, exam, absent
// fine, …). How often a head can be billed decides how Generate Dues keeps
// from charging it twice:
//   Monthly         once per student per month
//   Occasional      when picked, at most once per student per billing month
//                   (exam fee, picnic, sports)
//   Yearly          once per student per academic year
//   One Time        once per student, ever (admission)
//   Per Absent Day  the class amount times the days fined in Monthly
//                   Attendance Fine, once per saved fine
// Soft-deleted like the other setup records. In-memory like the rest of
// admin; replace with API calls once the backend endpoints exist.

export const feeFrequencies = ["Monthly", "Occasional", "Yearly", "One Time", "Per Absent Day"] as const
export type FeeFrequency = (typeof feeFrequencies)[number]

export type FeeHead = AcademicRecord & {
  nameBn: string
  frequency: FeeFrequency
  description: string
}

const heads: [string, string, FeeFrequency, string][] = [
  ["Tuition Fee", "বেতন", "Monthly", "Charged every month."],
  ["ICT Lab Fee", "আইসিটি ল্যাব ফি", "Monthly", ""],
  ["Admission Fee", "ভর্তি ফি", "One Time", "Charged once, on admission."],
  ["Session Fee", "সেশন ফি", "Yearly", "Charged once each academic year."],
  ["Exam Fee", "পরীক্ষার ফি", "Occasional", "Picked when a term exam is billed."],
  ["Absent Fine", "অনুপস্থিতি জরিমানা", "Per Absent Day", "Per day fined in Monthly Attendance Fine."],
]

export const feeHeadStore = createRecordStore<FeeHead>(
  "FeeHead",
  [1, 5].flatMap((instituteId, i) =>
    heads.map(([name, nameBn, frequency, description], index) => ({
      id: i * heads.length + index + 1,
      instituteId,
      name,
      nameBn,
      frequency,
      description,
      rank: index + 1,
      status: "Active" as const,
    }))
  )
)

// Whole taka are the norm, but paisa are kept (e.g. a waived half).
export function formatAmount(amount: number) {
  const rounded = Math.round(amount * 100) / 100
  return `৳${rounded.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export const roundMoney = (amount: number) => Math.round(amount * 100) / 100

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function belowHundred(n: number) {
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`
}

function belowThousand(n: number) {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  return [hundred ? `${ones[hundred]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ")
}

// "One Thousand Two Hundred Fifty Taka Only", counted in crore and lakh as
// Bangladeshi receipts write it.
export function amountInWords(amount: number) {
  const taka = Math.floor(roundMoney(amount))
  const paisa = Math.round((roundMoney(amount) - taka) * 100)
  const parts: string[] = []
  let n = taka
  const crore = Math.floor(n / 10_000_000)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000)
  n %= 100_000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (crore) parts.push(`${belowThousand(crore)} Crore`)
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
  if (n) parts.push(belowThousand(n))
  const words = parts.length ? parts.join(" ") : "Zero"
  return `${words} Taka${paisa ? ` and ${belowHundred(paisa)} Paisa` : ""} Only`
}
