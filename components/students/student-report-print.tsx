"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, FileSpreadsheetIcon, PrinterIcon } from "lucide-react"
import { toast } from "sonner"

import { exportStudentReport } from "@/components/students/student-report-export"
import { useStudentReport } from "@/components/students/use-student-report"
import { Button } from "@/components/ui/button"
import { columnLabel, decodeConfig, selectedColumns } from "@/lib/student-report"
import { cn } from "@/lib/utils"

// Left-aligned like the legacy report; everything else is centred.
const leftAligned = new Set(["FullName", "FatherName", "MotherName", "PresentAddress", "Email"])

// Legacy Partial/_DynamicReport: the chosen information for the chosen
// students, split into pages of N rows, each with the institute heading, the
// filters used and signature lines.
export function StudentReportPrint() {
  const router = useRouter()
  const config = decodeConfig(useSearchParams().get("q"))
  const { institute, rows, lookups } = useStudentReport(config)
  const [exporting, setExporting] = React.useState(false)

  if (!config || !institute) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">
        Nothing to show. Go back to the Student Dynamic Report and generate it again.
      </p>
    )
  }

  const columns = selectedColumns(config.columns)
  const pages: (typeof rows)[] = []
  for (let i = 0; i < rows.length; i += config.rowsPerPage) {
    pages.push(rows.slice(i, i + config.rowsPerPage))
  }
  if (!pages.length) pages.push([])

  // "Class: Class Nine, Section: A, Year: 2026, Student Type: All, Gender: All"
  const f = config.filter
  const all = (value: string | undefined | null, label = "All") => value || label
  const filters = [
    institute.enableBranch && ["Branch", all(f.branchId != null ? lookups.name("branch", f.branchId) : "")],
    institute.enableMedium && ["Medium", all(f.medium)],
    ["Class", all(f.classId != null ? lookups.name("class", f.classId) : "")],
    ["Section", all(f.sectionId != null ? lookups.name("section", f.sectionId) : "")],
    institute.enableShift && ["Shift", all(f.shiftId != null ? lookups.name("shift", f.shiftId) : "")],
    ["Year", all(f.yearId != null ? lookups.name("year", f.yearId) : "")],
    ["Student Type", all(f.studentType)],
    institute.enableGroup && ["Group", all(f.groupId != null ? lookups.name("group", f.groupId) : "")],
    institute.enableVersion && ["Version", all(f.version)],
    ["Gender", all(f.gender)],
  ].filter((entry): entry is [string, string] => Array.isArray(entry))
  const landscape = config.orientation === "landscape"

  async function exportFile() {
    if (!config || !institute) return
    setExporting(true)
    try {
      await exportStudentReport({ config, rows, institute, lookups })
    } catch {
      toast.error("The Excel file couldn't be created.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-svh bg-muted/40 print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">
          {rows.length} student{rows.length === 1 ? "" : "s"} · {pages.length} page
          {pages.length === 1 ? "" : "s"} · {landscape ? "Landscape" : "Portrait"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportFile} disabled={exporting || !rows.length}>
            <FileSpreadsheetIcon data-icon="inline-start" />
            Export
          </Button>
          <Button size="sm" onClick={() => window.print()} disabled={!rows.length}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 overflow-x-auto py-6 print:block print:overflow-visible print:p-0">
        {pages.map((pageRows, pageIndex) => (
          <section
            key={pageIndex}
            className={cn(
              "flex flex-col bg-white p-[10mm] font-serif text-black shadow-sm print:shadow-none",
              landscape ? "min-h-[210mm] w-[297mm]" : "min-h-[297mm] w-[210mm]",
              pageIndex < pages.length - 1 && "print:break-after-page"
            )}
          >
            <header className="text-center">
              <h1 className="text-lg leading-tight font-bold uppercase">{institute.name}</h1>
              <p className="text-xs">{institute.address}</p>
              <h2 className="mt-1 text-base font-bold underline underline-offset-4">{config.title}</h2>
              <p className="mt-1 text-xs">
                {filters.map(([label, value]) => `${label}: ${value}`).join(", ")}
              </p>
            </header>

            <table className="mt-3 w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr>
                  <th className="border border-black px-1 py-0.5">Sl</th>
                  {columns.map((column) => (
                    <th key={column.key} className="border border-black px-1 py-0.5 whitespace-nowrap">
                      {columnLabel(column, institute)}
                    </th>
                  ))}
                  {config.extraFields.map((field) => (
                    <th key={field} className="border border-black px-1 py-0.5 whitespace-nowrap">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ student, enrolment }, index) => (
                  <tr key={student.id} className="break-inside-avoid">
                    <td className="border border-black px-1 py-0.5 text-center tabular-nums">
                      {pageIndex * config.rowsPerPage + index + 1}
                    </td>
                    {columns.map((column) => {
                      const value = column.value({ student, enrolment, lookups })
                      const empty = !value || value === "—"
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "border border-black px-1 py-0.5 whitespace-nowrap",
                            leftAligned.has(column.key) && !empty ? "text-left" : "text-center"
                          )}
                        >
                          {column.key === "Image" ? (
                            value ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={value} alt="" className="mx-auto h-8 w-7 object-cover" />
                            ) : (
                              "-"
                            )
                          ) : empty ? (
                            "-"
                          ) : (
                            value
                          )}
                        </td>
                      )
                    })}
                    {config.extraFields.map((field) => (
                      <td key={field} className="min-w-16 border border-black px-1 py-0.5">
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={columns.length + config.extraFields.length + 1} className="border border-black p-4 text-center">
                      No students match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <footer className="mt-auto flex items-end justify-around gap-6 pt-14 text-xs">
              {config.signatures.filter(Boolean).map((signature) => (
                <span key={signature} className="min-w-32 border-t border-black pt-1 text-center">
                  {signature}
                </span>
              ))}
            </footer>
            <p className="mt-2 text-right text-[10px]">
              Page {pageIndex + 1} of {pages.length}
            </p>
          </section>
        ))}
      </div>
      <style>{`@media print { @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 0; } }`}</style>
    </div>
  )
}
