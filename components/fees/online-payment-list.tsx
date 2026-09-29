"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLinkIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { useFeeScope } from "@/components/fees/fee-scope"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCan } from "@/lib/access"
import { useCurrentUser } from "@/lib/current-user"
import { formatAmount } from "@/lib/fee-heads"
import { onlineGateways, useFeePayments } from "@/lib/fee-payments"
import { sendPaymentSms } from "@/lib/fee-sms"
import {
  effectiveStatus,
  onlinePaymentStatuses,
  useOnlinePayments,
  verifyOnlinePayment,
  type OnlinePaymentStatus,
} from "@/lib/online-payments"
import { useStudents } from "@/lib/students"

const statusClass: Record<OnlinePaymentStatus, string> = {
  Initiated: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  Processing: "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Success: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400",
  Failed: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400",
  Cancelled: "text-muted-foreground",
  Expired: "text-muted-foreground",
}

// Fees › Online Payments: every payment request made for an institute and
// where it stands. A request stuck in Processing (the gateway accepted it
// but verification never ran, e.g. the payer closed the page) can be
// verified from here; it is then recorded once, like the checkout does.
export function OnlinePaymentList() {
  const scope = useFeeScope()
  const { institute, institutes, canPick, param, setParam } = scope
  const requests = useOnlinePayments()
  const payments = useFeePayments()
  const students = useStudents()
  const can = useCan()
  const user = useCurrentUser()
  const studentOf = new Map(students.map((s) => [s.id, s]))
  const receiptOf = new Map(payments.map((p) => [p.id, p.receiptNo]))
  const [now] = React.useState(() => Date.now())

  const rows = requests
    .filter(
      (r) =>
        r.instituteId === institute?.id &&
        (!param("gateway") || r.gateway === param("gateway")) &&
        (!param("status") || effectiveStatus(r, now) === param("status"))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function verify(id: number) {
    try {
      const payment = verifyOnlinePayment(id, user.name)
      if (payment && institute) {
        sendPaymentSms(payment, institute, user.name)
        toast.success(`Verified, receipt ${payment.receiptNo}`)
      } else {
        toast.error("Verified, but the dues were already paid. Refund it at the gateway.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The payment could not be verified.")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Online Payments</CardTitle>
            <CardDescription>
              bKash, Nagad and card payments requested from Fee Collection. Sandbox: no real gateway is connected yet.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/fees/collect">New payment link</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
            />
          )}
          <FilterField
            label="Gateway"
            value={param("gateway")}
            onChange={(v) => setParam({ gateway: v })}
            options={onlineGateways.map((g) => ({ value: g, label: g }))}
            allLabel="All gateways"
          />
          <FilterField
            label="Status"
            value={param("status")}
            onChange={(v) => setParam({ status: v })}
            options={onlinePaymentStatuses.map((s) => ({ value: s, label: s }))}
            allLabel="All statuses"
          />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Made</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((r) => {
                const status = effectiveStatus(r, now)
                const s = studentOf.get(r.studentId)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.token}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      <span className="block text-muted-foreground">by {r.createdBy}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{s?.name ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">ID {s?.studentIdentificationNo}</span>
                    </TableCell>
                    <TableCell>
                      {r.gateway ?? "—"}
                      {r.payerAccount && <span className="block text-xs text-muted-foreground">{r.payerAccount}</span>}
                      {r.trxId && <span className="block font-mono text-xs text-muted-foreground">{r.trxId}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass[status]}>
                        {status}
                      </Badge>
                      {r.failureReason && status !== "Success" && (
                        <span className="block max-w-48 text-xs text-muted-foreground">{r.failureReason}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.paymentId != null ? (receiptOf.get(r.paymentId) ?? "—") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {status === "Initiated" && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/pay/${r.token}`}>
                              <ExternalLinkIcon data-icon="inline-start" />
                              Checkout
                            </Link>
                          </Button>
                        )}
                        {status === "Processing" && can("fee-collection.manage") && (
                          <Button size="sm" variant="outline" onClick={() => verify(r.id)}>
                            <ShieldCheckIcon data-icon="inline-start" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {institute ? "No online payment matches these filters." : "Select an institute."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
