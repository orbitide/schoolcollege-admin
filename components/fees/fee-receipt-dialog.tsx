"use client"

import { PrinterIcon } from "lucide-react"

import { FeeReceiptSheet } from "@/components/fees/fee-receipt"
import { PrintArea } from "@/components/reports/print-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFeeInvoices } from "@/lib/fee-invoices"
import type { FeePayment } from "@/lib/fee-payments"
import { useInstitute } from "@/lib/institutes-store"
import { useStudent } from "@/lib/students"

// A receipt on screen with a Print button (student and office copy on one
// A4 page). Printing from this tab, since the data lives in its memory.
export function FeeReceiptDialog({
  payment,
  onClose,
}: {
  payment: FeePayment | null
  onClose: () => void
}) {
  const institute = useInstitute(payment?.instituteId ?? -1)
  const student = useStudent(payment?.studentId ?? -1)
  const invoices = useFeeInvoices()
  const sheet = payment && institute && (
    <FeeReceiptSheet institute={institute} payment={payment} student={student} invoices={invoices} />
  )

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receipt {payment?.receiptNo}</DialogTitle>
          <DialogDescription>Prints the student copy and the office copy on one A4 page.</DialogDescription>
        </DialogHeader>
        {sheet && <div className="rounded-md border">{sheet}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </DialogFooter>
        {sheet && <PrintArea pageSize="A4 portrait" margin="8mm">{sheet}</PrintArea>}
      </DialogContent>
    </Dialog>
  )
}
