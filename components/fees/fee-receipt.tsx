"use client"

import type { ComponentProps } from "react"

import { fmtDate } from "@/components/fees/fee-scope"
import { useStudentLookups } from "@/components/students/student-lookups"
import { amountInWords, feeHeadStore, formatAmount } from "@/lib/fee-heads"
import { monthLabel, type FeeInvoice } from "@/lib/fee-invoices"
import type { FeePayment } from "@/lib/fee-payments"
import type { Institute } from "@/lib/institutes"
import type { Student } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

// A money receipt: the institute heading, the receipt number and date, the
// student, a row per invoice line paid (month, fee head, amount), the total
// in figures and words, how it was paid and who collected it. Printed twice
// on the page (student and office copy). A cancelled receipt says so.
export function FeeReceipt({
  institute,
  payment,
  student,
  invoices,
  copy,
}: {
  institute: Institute
  payment: FeePayment
  student?: Student
  invoices: FeeInvoice[]
  copy: "Student Copy" | "Office Copy"
}) {
  const name = useStudentLookups()
  const heads = feeHeadStore.useAll()
  const headName = new Map(heads.map((h) => [h.id, h.name]))
  const byId = new Map(invoices.map((i) => [i.id, i]))
  const first = byId.get(payment.allocations[0]?.invoiceId ?? -1)
  const enrolment = student?.enrolments.find((e) => e.yearId === first?.yearId) ?? student?.enrolments.at(-1)
  const config = institute.configuration
  const td = "border border-black px-2 py-0.5"
  const rows = payment.allocations.map((a) => {
    const invoice = byId.get(a.invoiceId)
    const line = invoice?.lines.find((l) => l.id === a.lineId)
    return {
      key: `${a.invoiceId}-${a.lineId}`,
      month: invoice ? monthLabel(invoice.month) : "—",
      head: line ? (headName.get(line.feeHeadId) ?? "—") : "—",
      note: line?.note ?? "",
      amount: a.amount,
    }
  })

  return (
    <section className="relative flex flex-col gap-2 bg-white p-4 font-serif text-[13px] text-black">
      {payment.status === "Cancelled" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold text-red-600/20 -rotate-12">
          CANCELLED
        </span>
      )}
      <header className="flex items-center justify-center gap-4">
        {institute.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={institute.logoUrl} alt="" style={{ width: config.reportLogoWidth || "56px" }} />
        )}
        <div className="flex flex-col items-center text-center">
          <h1 style={{ ...parseInlineStyle(config.reportHeaderStyle), fontSize: 20 }}>{institute.name}</h1>
          <p className="text-xs">{institute.address}</p>
          <h2 className="mt-1 rounded border border-black px-3 text-sm font-bold uppercase">Money Receipt</h2>
        </div>
      </header>
      <div className="flex justify-between text-xs">
        <span>
          Receipt No: <strong>{payment.receiptNo}</strong>
        </span>
        <span className="italic">{copy}</span>
        <span>
          Date: <strong>{fmtDate(payment.paidOn)}</strong>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <span>
          Name: <strong>{student?.name ?? "—"}</strong>
        </span>
        <span>
          Student ID: <strong>{student?.studentIdentificationNo ?? "—"}</strong>
        </span>
        <span>
          Class: <strong>{name("class", enrolment?.classId)}</strong>
          {enrolment?.sectionId != null && (
            <>
              {" "}
              Section: <strong>{name("section", enrolment.sectionId)}</strong>
            </>
          )}
        </span>
        <span>
          Roll: <strong>{enrolment?.classRoll ?? "—"}</strong>
        </span>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={cn(td, "w-8")}>SL</th>
            <th className={cn(td, "text-left")}>Month</th>
            <th className={cn(td, "text-left")}>Particulars</th>
            <th className={cn(td, "w-28 text-right")}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key}>
              <td className={cn(td, "text-center")}>{i + 1}</td>
              <td className={td}>{r.month}</td>
              <td className={td}>
                {r.head}
                {r.note && <span className="block text-[10px] text-gray-600">{r.note}</span>}
              </td>
              <td className={cn(td, "text-right tabular-nums")}>{formatAmount(r.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className={cn(td, "text-right font-bold")} colSpan={3}>
              Total
            </td>
            <td className={cn(td, "text-right font-bold tabular-nums")}>{formatAmount(payment.total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs">
        In words: <strong>{amountInWords(payment.total)}</strong>
      </p>
      <p className="text-xs">
        Paid by <strong>{payment.method}</strong>
        {payment.reference && (
          <>
            {" "}
            (Ref: <strong>{payment.reference}</strong>)
          </>
        )}
        {payment.source === "Online" && " · online payment"}
        {payment.status === "Cancelled" && (
          <span className="text-red-600"> · Cancelled: {payment.cancelReason}</span>
        )}
      </p>
      <div className="mt-6 flex justify-between text-xs">
        <span className="border-t border-black px-4 pt-0.5">Guardian</span>
        <span className="border-t border-black px-4 pt-0.5">Received by {payment.createdBy}</span>
      </div>
    </section>
  )
}

// Student and office copy, one above the other, for an A4 page.
export function FeeReceiptSheet(props: Omit<ComponentProps<typeof FeeReceipt>, "copy">) {
  return (
    <div className="flex flex-col gap-4">
      <FeeReceipt {...props} copy="Student Copy" />
      <div className="border-t border-dashed border-gray-500" />
      <FeeReceipt {...props} copy="Office Copy" />
    </div>
  )
}
