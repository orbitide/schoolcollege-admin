"use client"

import * as React from "react"
import { CircleCheckIcon, CircleSlashIcon, EllipsisVerticalIcon, EyeIcon, FilePlusIcon } from "lucide-react"
import { toast } from "sonner"

import { InvoiceStateBadge } from "@/components/subscriptions/invoice-state-badge"
import { InvoiceDialog, MarkPaidDialog } from "@/components/subscriptions/subscription-dialogs"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTaka, monthName, monthOf } from "@/lib/billing"
import { useCurrentUser } from "@/lib/current-user"
import { formatDate, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import {
  generateInvoices,
  invoiceState,
  invoiceStates,
  unbilledInstitutes,
  useSaasInvoices,
  voidInvoice,
  type SaasInvoice,
} from "@/lib/saas-invoices"

// The platform's invoices to institutes, newest first, with the month-end
// run: until the API issues them itself, last month's invoices are issued
// from here. Pass `instituteId` to list one institute's only.
export function InvoiceList({ instituteId }: { instituteId?: number }) {
  const institutes = useInstitutes()
  const invoices = useSaasInvoices()
  const user = useCurrentUser()
  const [month, setMonth] = React.useState("")
  const [state, setState] = React.useState("")
  const [institute, setInstitute] = React.useState("")
  const [confirmRun, setConfirmRun] = React.useState(false)

  const lastMonth = monthOf(-1)
  const unbilled = instituteId == null ? unbilledInstitutes(lastMonth, institutes, invoices) : []
  const months = [...new Set(invoices.map((i) => i.month))].sort().reverse()
  const nameOf = (id: number) => institutes.find((i) => i.id === id)?.name ?? `Institute #${id}`

  const rows = invoices
    .filter(
      (i) =>
        (instituteId == null || i.instituteId === instituteId) &&
        (!month || i.month === month) &&
        (!state || invoiceState(i) === state) &&
        (!institute || String(i.instituteId) === institute)
    )
    .sort((a, b) => b.month.localeCompare(a.month) || nameOf(a.instituteId).localeCompare(nameOf(b.instituteId)))
  const total = rows.filter((i) => i.status !== "Void").reduce((sum, i) => sum + i.amount, 0)

  function run() {
    const added = generateInvoices(lastMonth, institutes, user.name)
    toast.success(
      added
        ? `Issued ${added} ${added === 1 ? "invoice" : "invoices"} for ${monthName(lastMonth)}`
        : `Every active institute already has a ${monthName(lastMonth)} invoice`
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {unbilled.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 py-4">
          <CardContent className="flex flex-wrap items-center gap-3">
            <FilePlusIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {unbilled.length} active {unbilled.length === 1 ? "institute has" : "institutes have"} no invoice
                for {monthName(lastMonth)}
              </p>
              <p className="text-sm text-muted-foreground">
                Invoices bill each institute&apos;s active students at today&apos;s count and its rates.
              </p>
            </div>
            <Button size="sm" onClick={() => setConfirmRun(true)}>
              Generate invoices for {monthName(lastMonth)}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField
            label="Month"
            value={month}
            onChange={setMonth}
            allLabel="All months"
            options={months.map((m) => ({ value: m, label: monthName(m) }))}
          />
          <FilterField
            label="Status"
            value={state}
            onChange={setState}
            allLabel="All statuses"
            options={invoiceStates.map((s) => ({ value: s, label: s }))}
          />
          {instituteId == null && (
            <FilterField
              label="Institute"
              value={institute}
              onChange={setInstitute}
              allLabel="All institutes"
              options={[...institutes]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((i) => ({ value: String(i.id), label: i.name }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Invoice</TableHead>
              {instituteId == null && <TableHead>Institute</TableHead>}
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No invoices match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium tabular-nums">{invoice.invoiceNo}</TableCell>
                  {instituteId == null && <TableCell>{nameOf(invoice.instituteId)}</TableCell>}
                  <TableCell className="whitespace-nowrap">{monthName(invoice.month)}</TableCell>
                  <TableCell className="text-right tabular-nums">{invoice.studentCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatTaka(invoice.rate)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatTaka(invoice.amount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <InvoiceStateBadge state={invoiceState(invoice)} />
                  </TableCell>
                  <TableCell>
                    <InvoiceActions invoice={invoice} institute={institutes.find((i) => i.id === invoice.instituteId)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={instituteId == null ? 5 : 4}>
                  {rows.length} {rows.length === 1 ? "invoice" : "invoices"} (void ones not totalled)
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatTaka(total)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate {monthName(lastMonth)} invoices?</AlertDialogTitle>
            <AlertDialogDescription>
              Issues an invoice to each of the {unbilled.length} active institutes without one. Institutes already
              invoiced for the month are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Generate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InvoiceActions({ invoice, institute }: { invoice: SaasInvoice; institute: Institute | undefined }) {
  const user = useCurrentUser()
  const [open, setOpen] = React.useState<"view" | "pay" | "void" | null>(null)
  const due = invoice.status === "Due"
  const name = institute?.name ?? `Institute #${invoice.instituteId}`

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <EllipsisVerticalIcon />
            <span className="sr-only">Actions for {invoice.invoiceNo}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setOpen("view")}>
            <EyeIcon />
            View invoice
          </DropdownMenuItem>
          {due && (
            <>
              <DropdownMenuItem onSelect={() => setOpen("pay")}>
                <CircleCheckIcon />
                Mark paid
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setOpen("void")}>
                <CircleSlashIcon />
                Void
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <InvoiceDialog
        invoice={invoice}
        open={open === "view"}
        onOpenChange={(o) => setOpen(o ? "view" : null)}
      />
      <MarkPaidDialog
        invoice={invoice}
        instituteName={name}
        open={open === "pay"}
        onOpenChange={(o) => setOpen(o ? "pay" : null)}
      />
      <AlertDialog open={open === "void"} onOpenChange={(o) => setOpen(o ? "void" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void {invoice.invoiceNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} will no longer owe {formatTaka(invoice.amount)} for {monthName(invoice.month)}. The month can then be
              invoiced again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (voidInvoice(invoice.id, user.name)) toast.success(`${invoice.invoiceNo} voided`)
                else toast.error("Only a due invoice can be voided.")
              }}
            >
              Void invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
