"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, PrinterIcon } from "lucide-react"

import { useSmsSummary } from "@/components/sms/sms-summary"
import { SmsSummarySheet } from "@/components/sms/sms-summary-sheet"
import { Button } from "@/components/ui/button"
import { summaryProblems } from "@/lib/sms-summary"

// The SMS Summary on an A4 page of its own, for printing (legacy
// printElem('SmsReportDetailsDiv')).
export function SmsSummaryPrint() {
  const router = useRouter()
  const { institute, filter, rows } = useSmsSummary(useSearchParams())
  const problems = summaryProblems(filter)

  return (
    <div className="min-h-svh bg-muted/40 print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!!problems.length}>
          <PrinterIcon data-icon="inline-start" />
          Print
        </Button>
      </div>
      <div className="flex justify-center overflow-x-auto py-6 print:block print:p-0">
        {problems.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{problems.join(" ")}</p>
        ) : (
          <section className="min-h-[297mm] w-[210mm] bg-white p-[12mm] shadow-sm print:shadow-none">
            <SmsSummarySheet institute={institute} filter={filter} rows={rows} details={filter.details} />
          </section>
        )}
      </div>
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } }`}</style>
    </div>
  )
}
