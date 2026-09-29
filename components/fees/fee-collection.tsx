"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  CopyIcon,
  ExternalLinkIcon,
  Link2Icon,
  PrinterIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react"
import { toast } from "sonner"

import { FeeReceiptDialog } from "@/components/fees/fee-receipt-dialog"
import { dueStatusClass, fmtDate, useFeeScope } from "@/components/fees/fee-scope"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentUser } from "@/lib/current-user"
import { feeHeadStore, formatAmount, roundMoney } from "@/lib/fee-heads"
import { monthLabel } from "@/lib/fee-invoices"
import {
  allocate,
  openLines,
  paymentMethods,
  recordPayment,
  useFeeLedger,
  type FeePayment,
  type PaymentMethod,
} from "@/lib/fee-payments"
import { feeTemplate, sendPaymentSms, studentNumbers } from "@/lib/fee-sms"
import { useFeeWaivers } from "@/lib/fee-waivers"
import type { Institute } from "@/lib/institutes"
import { createPaymentRequest, REQUEST_MINUTES, type OnlinePayment } from "@/lib/online-payments"
import { queueAndSendSms, type SmsDraft } from "@/lib/sms-messages"
import { smsLength } from "@/lib/sms-templates"
import { currentEnrolment, useStudents, type Student } from "@/lib/students"

const todayIso = () => new Date().toISOString().slice(0, 10)
const lineRef = (invoiceId: number, lineId: number) => `${invoiceId}|${lineId}`

// Fees › Fee Collection, the counter: find the student, see every unpaid
// due oldest first, tick what is paid (or type an amount and let it fill
// the oldest dues), take cash or a mobile-banking / bank reference, and
// print the receipt. The receipt SMS goes to the guardian when the
// institute has an active "Fee Payment" template. An online payment link
// (bKash / Nagad / SSLCommerz sandbox) can be made for the guardian instead.
export function FeeCollection() {
  const scope = useFeeScope()
  const { institute, institutes, canPick, param, setParam } = scope
  const students = useStudents()
  const name = useStudentLookups()
  const [query, setQuery] = React.useState("")
  const student = students.find(
    (s) => String(s.id) === param("student") && s.instituteId === institute?.id
  )

  const needle = query.trim().toLowerCase()
  const matches = React.useMemo(() => {
    if (!institute || needle.length < 2) return []
    return students
      .filter((s) => {
        if (s.instituteId !== institute.id) return false
        const e = currentEnrolment(s)
        return (
          String(s.studentIdentificationNo).includes(needle) ||
          s.name.toLowerCase().includes(needle) ||
          s.primaryMobile.includes(needle) ||
          s.fatherMobile.includes(needle) ||
          e?.classRoll === needle
        )
      })
      .slice(0, 10)
  }, [students, institute, needle])

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Fee Collection</CardTitle>
            <CardDescription>Find the student, collect their dues and print the receipt.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/fees/payments">Receipts</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, student: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
            />
          )}
          <Field className="lg:col-span-2">
            <FieldLabel htmlFor="fee-student-search">Student</FieldLabel>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fee-student-search"
                className="pl-8"
                placeholder="Student ID, name, roll or mobile"
                value={query}
                disabled={!institute}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            {matches.length > 0 && (
              <ul className="mt-1 divide-y rounded-md border">
                {matches.map((s) => {
                  const e = currentEnrolment(s)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setParam({ student: String(s.id) })
                          setQuery("")
                        }}
                      >
                        <span>
                          <span className="font-medium">{s.name}</span>{" "}
                          <span className="text-muted-foreground">
                            · ID {s.studentIdentificationNo} · {name("class", e?.classId)} {name("section", e?.sectionId)} · Roll{" "}
                            {e?.classRoll}
                          </span>
                        </span>
                        {s.status !== "Active" && <Badge variant="outline">{s.status}</Badge>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {needle.length >= 2 && !matches.length && (
              <FieldDescription>No student matches &ldquo;{query.trim()}&rdquo;.</FieldDescription>
            )}
          </Field>
        </CardContent>
      </Card>

      {institute && student ? (
        <StudentCounter key={student.id} institute={institute} student={student} onChange={() => setParam({ student: "" })} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {institute ? "Search for a student to collect their fees." : "Select an institute."}
        </p>
      )}
    </div>
  )
}

function StudentCounter({
  institute,
  student,
  onChange,
}: {
  institute: Institute
  student: Student
  onChange: () => void
}) {
  const user = useCurrentUser()
  const name = useStudentLookups()
  const ledger = useFeeLedger()
  const waivers = useFeeWaivers()
  const heads = feeHeadStore.useAll()
  const headName = new Map(heads.map((h) => [h.id, h.name]))
  const enrolment = currentEnrolment(student)
  const open = React.useMemo(
    () => openLines(ledger.invoices, ledger.payments, student.id),
    [ledger, student.id]
  )
  const totalDue = roundMoney(open.reduce((sum, l) => sum + l.due, 0))
  const history = ledger.payments
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id)
  const myWaivers = waivers.filter((w) => w.studentId === student.id)

  // What is being paid on each open line ("" = not ticked).
  const [pay, setPay] = React.useState<Record<string, string>>({})
  const [openKey, setOpenKey] = React.useState("")
  const currentKey = open.map((l) => `${lineRef(l.invoice.id, l.line.id)}:${l.due}`).join(",")
  if (openKey !== currentKey) {
    setOpenKey(currentKey)
    setPay(Object.fromEntries(open.map((l) => [lineRef(l.invoice.id, l.line.id), String(l.due)])))
  }
  const [method, setMethod] = React.useState<PaymentMethod>("Cash")
  const [reference, setReference] = React.useState("")
  const [paidOn, setPaidOn] = React.useState(todayIso())
  const [note, setNote] = React.useState("")
  const hasTemplate = !!feeTemplate(institute.id, "Fee Payment")
  const [sendSms, setSendSms] = React.useState(hasTemplate)
  const [receipt, setReceipt] = React.useState<FeePayment | null>(null)
  const [quick, setQuick] = React.useState("")
  const [linking, setLinking] = React.useState(false)

  const selected = open.filter((l) => (Number(pay[lineRef(l.invoice.id, l.line.id)]) || 0) > 0)
  const total = roundMoney(selected.reduce((sum, l) => sum + (Number(pay[lineRef(l.invoice.id, l.line.id)]) || 0), 0))
  const overpaid = open.some((l) => (Number(pay[lineRef(l.invoice.id, l.line.id)]) || 0) > l.due)
  const allTicked = open.length > 0 && selected.length === open.length

  function fillAmount(value: string) {
    setQuick(value)
    const amount = Number(value)
    if (!(amount > 0)) return
    const { allocations } = allocate(open, amount)
    const next = Object.fromEntries(open.map((l) => [lineRef(l.invoice.id, l.line.id), ""]))
    for (const a of allocations) next[lineRef(a.invoiceId, a.lineId)] = String(a.amount)
    setPay(next)
  }

  function collect() {
    try {
      const payment = recordPayment(
        {
          instituteId: institute.id,
          studentId: student.id,
          paidOn,
          method,
          reference,
          note,
          allocations: open.map((l) => ({
            invoiceId: l.invoice.id,
            lineId: l.line.id,
            amount: Number(pay[lineRef(l.invoice.id, l.line.id)]) || 0,
          })),
          source: "Counter",
          onlinePaymentId: null,
        },
        user.name
      )
      let description = `${formatAmount(payment.total)} by ${payment.method}.`
      if (sendSms) {
        const sms = sendPaymentSms(payment, institute, user.name)
        description += sms.ok
          ? sms.sent
            ? ` Receipt SMS sent to ${sms.mobile}.`
            : " Receipt SMS queued (not enough SMS balance)."
          : ` No SMS: ${sms.reason}`
      }
      toast.success(`Collected, receipt ${payment.receiptNo}`, { description })
      setReceipt(payment)
      setReference("")
      setNote("")
      setQuick("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The payment could not be saved.")
    }
  }

  const guardianMobile = studentNumbers(student)[0]

  return (
    <>
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {student.name}
              {student.status !== "Active" && <Badge variant="outline">{student.status}</Badge>}
            </CardTitle>
            <CardDescription>
              ID {student.studentIdentificationNo} · {name("class", enrolment?.classId)} {name("section", enrolment?.sectionId)} ·
              Roll {enrolment?.classRoll ?? "—"} · Father {student.fatherName || "—"}
              {guardianMobile && ` · SMS to ${guardianMobile[1]} ${guardianMobile[0]}`}
            </CardDescription>
            {myWaivers.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {myWaivers.map((w) => (
                  <Badge key={w.id} variant="secondary">
                    {w.percent}% off {headName.get(w.feeHeadId)} ({w.reason})
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-muted-foreground">Total due</span>
            <span className="text-2xl font-semibold tabular-nums">{formatAmount(totalDue)}</span>
            <Button size="sm" variant="ghost" onClick={onChange}>
              <ArrowLeftRightIcon data-icon="inline-start" />
              Other student
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Dues</CardTitle>
            <CardDescription>
              {open.length
                ? `${open.length} unpaid line${open.length === 1 ? "" : "s"}, oldest first. Untick or lower an amount to leave it for later.`
                : "Nothing is due."}
            </CardDescription>
          </div>
          {open.length > 0 && (
            <div className="flex items-end gap-2">
              <Field className="w-44">
                <FieldLabel htmlFor="fee-quick">Pay an amount</FieldLabel>
                <Input
                  id="fee-quick"
                  inputMode="decimal"
                  placeholder="Fills oldest first"
                  value={quick}
                  onChange={(e) => fillAmount(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </Field>
              <Button variant="outline" onClick={() => setLinking(true)}>
                <Link2Icon data-icon="inline-start" />
                Online payment link
              </Button>
            </div>
          )}
        </CardHeader>
        {open.length > 0 && (
          <>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Pay all"
                          checked={allTicked ? true : selected.length ? "indeterminate" : false}
                          onCheckedChange={(on) =>
                            setPay(
                              Object.fromEntries(
                                open.map((l) => [lineRef(l.invoice.id, l.line.id), on ? String(l.due) : ""])
                              )
                            )
                          }
                        />
                      </TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Fee head</TableHead>
                      <TableHead className="text-right">Payable</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="w-36 text-right">Paying now</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {open.map((l) => {
                      const ref = lineRef(l.invoice.id, l.line.id)
                      const value = pay[ref] ?? ""
                      const ticked = (Number(value) || 0) > 0
                      const overdue = l.invoice.dueDate < todayIso()
                      return (
                        <TableRow key={ref}>
                          <TableCell>
                            <Checkbox
                              aria-label={`Pay ${headName.get(l.line.feeHeadId)} ${monthLabel(l.invoice.month)}`}
                              checked={ticked}
                              onCheckedChange={(on) => setPay((p) => ({ ...p, [ref]: on ? String(l.due) : "" }))}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {monthLabel(l.invoice.month)}
                            {overdue && (
                              <Badge variant="outline" className={`ml-2 ${dueStatusClass.Overdue}`}>
                                Overdue
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{l.invoice.invoiceNo}</TableCell>
                          <TableCell>
                            {headName.get(l.line.feeHeadId) ?? "—"}
                            {l.line.waiver > 0 && (
                              <span className="block text-xs text-green-700 dark:text-green-400">
                                {formatAmount(l.line.waiver)} waived
                              </span>
                            )}
                            {l.line.note && <span className="block text-xs text-muted-foreground">{l.line.note}</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatAmount(l.payable)}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.paid ? formatAmount(l.paid) : "—"}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatAmount(l.due)}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              inputMode="decimal"
                              className="ml-auto w-28 text-right tabular-nums"
                              aria-label="Paying now"
                              aria-invalid={(Number(value) || 0) > l.due}
                              value={value}
                              onChange={(e) =>
                                setPay((p) => ({ ...p, [ref]: e.target.value.replace(/[^\d.]/g, "") }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardContent className="grid gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="fee-paid-on">Payment date</FieldLabel>
                <Input id="fee-paid-on" type="date" max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
              <FilterField
                label="Method"
                required
                value={method}
                onChange={(v) => setMethod(v as PaymentMethod)}
                options={paymentMethods.map((m) => ({ value: m, label: m }))}
              />
              <Field>
                <FieldLabel htmlFor="fee-ref">
                  {method === "Cash" ? "Reference (optional)" : method === "Cheque" ? "Cheque number" : "Transaction ID / reference"}
                </FieldLabel>
                <Input
                  id="fee-ref"
                  value={reference}
                  placeholder={method === "Cash" ? "" : "Required"}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fee-note">Note</FieldLabel>
                <Input id="fee-note" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={sendSms} disabled={!hasTemplate} onCheckedChange={(on) => setSendSms(on === true)} />
                Send receipt SMS
                {!hasTemplate && (
                  <span className="text-xs text-muted-foreground">
                    (add an active{" "}
                    <Link className="underline" href="/sms/templates">
                      Fee Payment template
                    </Link>{" "}
                    first)
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  Collecting <strong className="text-base tabular-nums">{formatAmount(total)}</strong>
                </span>
                <Button onClick={collect} disabled={!(total > 0) || overpaid}>
                  <BanknoteIcon data-icon="inline-start" />
                  Collect &amp; print
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Every receipt of the student, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length ? (
                  history.map((p) => {
                    const months = [
                      ...new Set(
                        p.allocations.map((a) => ledger.invoices.find((i) => i.id === a.invoiceId)?.month ?? "")
                      ),
                    ]
                      .filter(Boolean)
                      .sort()
                    return (
                      <TableRow key={p.id} className={p.status === "Cancelled" ? "text-muted-foreground" : undefined}>
                        <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(p.paidOn)}</TableCell>
                        <TableCell>
                          {p.method}
                          {p.reference && <span className="block text-xs text-muted-foreground">{p.reference}</span>}
                        </TableCell>
                        <TableCell className="text-xs">{months.map(monthLabel).join(", ")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatAmount(p.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={p.status === "Cancelled" ? dueStatusClass.Overdue : dueStatusClass.Paid}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => setReceipt(p)}>
                            <PrinterIcon />
                            <span className="sr-only">Print receipt</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                      No payment yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FeeReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
      <PaymentLinkDialog
        open={linking}
        onClose={() => setLinking(false)}
        institute={institute}
        student={student}
        suggested={total > 0 ? total : totalDue}
        maxAmount={totalDue}
      />
    </>
  )
}

// Makes an online payment request for the student and shows its checkout
// link, which can be opened here (sandbox) or sent to the guardian by SMS.
function PaymentLinkDialog({
  open,
  onClose,
  institute,
  student,
  suggested,
  maxAmount,
}: {
  open: boolean
  onClose: () => void
  institute: Institute
  student: Student
  suggested: number
  maxAmount: number
}) {
  const user = useCurrentUser()
  const [amount, setAmount] = React.useState("")
  const [request, setRequest] = React.useState<OnlinePayment | null>(null)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setAmount(String(suggested))
      setRequest(null)
    }
  }
  const link = request ? `${typeof window === "undefined" ? "" : window.location.origin}/pay/${request.token}` : ""

  function create() {
    try {
      setRequest(createPaymentRequest(institute.id, student.id, Number(amount), user.name))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The payment request could not be made.")
    }
  }

  function smsLink() {
    if (!request) return
    const numbers = studentNumbers(student)
    if (!numbers.length) {
      toast.error("The student has no valid mobile number.")
      return
    }
    const message = `${institute.shortName || institute.name}: pay ${formatAmount(request.amount)} fees of ${student.name} online within ${REQUEST_MINUTES} minutes: ${link}`
    const { chars, parts } = smsLength(message)
    const drafts: SmsDraft[] = numbers.map(([mobile, numberType]) => ({
      mobile,
      message,
      studentId: student.id,
      numberType,
      chars,
      parts,
    }))
    const result = queueAndSendSms(
      {
        instituteId: institute.id,
        branchId: null,
        campaignName: `Payment link ${request.token}`,
        smsType: "Fee Due",
        resultType: null,
        attendanceType: null,
        examId: null,
        subjectId: null,
        attendanceDate: null,
      },
      drafts,
      user.name,
      institute.configuration.smsRate
    )
    toast.success(result.sent ? `Link sent to ${numbers[0][0]}` : "Link SMS queued (not enough SMS balance)")
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Online payment link</DialogTitle>
          <DialogDescription>
            The guardian pays by bKash, Nagad or card. The dues are marked paid only after the payment is verified.
            Sandbox: no real money moves.
          </DialogDescription>
        </DialogHeader>
        {request ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Request <strong className="font-mono">{request.token}</strong> for{" "}
              <strong>{formatAmount(request.amount)}</strong>, valid {REQUEST_MINUTES} minutes.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" aria-label="Payment link" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  void navigator.clipboard?.writeText(link)
                  toast.success("Link copied")
                }}
              >
                <CopyIcon />
                <span className="sr-only">Copy link</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The sandbox checkout only works in this browser tab (nothing is saved on a server yet).
            </p>
          </div>
        ) : (
          <Field>
            <FieldLabel htmlFor="link-amount">Amount</FieldLabel>
            <Input
              id="link-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <FieldDescription>Up to {formatAmount(maxAmount)}; it pays the oldest dues first.</FieldDescription>
          </Field>
        )}
        <DialogFooter>
          {request ? (
            <>
              <Button variant="outline" onClick={smsLink}>
                <SendIcon data-icon="inline-start" />
                Send by SMS
              </Button>
              <Button asChild>
                <Link href={`/pay/${request.token}`}>
                  <ExternalLinkIcon data-icon="inline-start" />
                  Open checkout
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={create} disabled={!(Number(amount) > 0)}>
                Make link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
