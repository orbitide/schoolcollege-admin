import type * as React from "react"

import { ReportHeading, spanAt } from "@/components/reports/result-summary-sheet"
import type { FailedCounts, FailedSummary, FailedSummaryRow } from "@/lib/failed-summary"
import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

// Legacy Partial/_failedSummary ("Subject wise failed Statistics"): the
// institute heading, then a table per academic group with a row per section
// — its students, how many failed or were absent, then failed and absent per
// subject — a total row, and a grand total across the groups when there are
// several. Styled as the printed report so the page and print match.
export function FailedSummarySheet({
  institute,
  branch,
  academicClass,
  exam,
  summary,
  withoutOptional,
  subjectLabel,
  name,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  summary: FailedSummary
  withoutOptional: boolean
  subjectLabel: (id: number) => string
  name: (kind: "section" | "group", id: number | null) => string
  className?: string
}) {
  const highlight = institute.configuration.reportHighlightColor.trim() || undefined
  const showGroup = institute.enableGroup && !!academicClass?.hasSubjectGroup
  const leading = [showGroup, institute.enableVersion].filter(Boolean).length

  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-1 text-center tabular-nums"
  // Legacy shortens the headings to F / A when there are many subjects.
  const failedAbsentHeads = (count: number) =>
    Array.from({ length: count }, (_, i) => [
      <th key={`f-${i}`} className={th}>
        {count > 12 ? "F" : "Failed"}
      </th>,
      <th key={`a-${i}`} className={th}>
        {count > 12 ? "A" : "Absent"}
      </th>,
    ])
  const cells = (c: FailedCounts | undefined, key: number, style?: React.CSSProperties) => [
    <td key={`f-${key}`} className={td} style={style}>
      {c?.failed ?? 0}
    </td>,
    <td key={`a-${key}`} className={td} style={style}>
      {c?.absent ?? 0}
    </td>,
  ]
  const totals = (c: FailedCounts, style?: React.CSSProperties) => [
    <td key="total" className={td} style={style}>
      {c.total}
    </td>,
    ...cells(c, -1, style),
  ]
  const versionKey = (r: FailedSummaryRow) => r.version

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      <ReportHeading
        institute={institute}
        branch={branch}
        academicClass={academicClass}
        exam={exam}
        title={`Subject wise failed Statistics (${withoutOptional ? "Without" : "With"} Optional)`}
      />

      {summary.tables.map((table) => (
        <table key={String(table.groupId)} className="mt-3 w-full border-collapse text-sm leading-tight">
          <thead>
            <tr>
              {showGroup && (
                <th className={th} rowSpan={2}>
                  Group
                </th>
              )}
              {institute.enableVersion && (
                <th className={th} rowSpan={2}>
                  Version
                </th>
              )}
              <th className={th} rowSpan={2}>
                Section
              </th>
              <th className={th} colSpan={3}>
                Total
              </th>
              {table.subjectIds.map((id) => (
                <th key={id} className={th} colSpan={2}>
                  {subjectLabel(id)}
                </th>
              ))}
            </tr>
            <tr>
              <th className={th}>Student</th>
              <th className={th}>Failed</th>
              <th className={th}>Absent</th>
              {failedAbsentHeads(table.subjectIds.length)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => {
              const versionSpan = spanAt(table.rows, index, versionKey)
              return (
                <tr key={row.sectionId} className="break-inside-avoid">
                  {showGroup && index === 0 && (
                    <td className={td} rowSpan={table.rows.length}>
                      {table.groupId == null ? "All Group" : name("group", table.groupId)}
                    </td>
                  )}
                  {institute.enableVersion && versionSpan > 0 && (
                    <td className={td} rowSpan={versionSpan}>
                      {row.version || "All Version"}
                    </td>
                  )}
                  <td className={td}>{name("section", row.sectionId)}</td>
                  {totals(row)}
                  {table.subjectIds.flatMap((id) => cells(row.subjects.get(id), id))}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className={cn(td, "text-right")} colSpan={leading + 1}>
                Total=
              </td>
              {totals(table.total, { color: highlight })}
              {table.subjectIds.flatMap((id) => cells(table.total.subjects.get(id), id, { color: highlight }))}
            </tr>
          </tfoot>
        </table>
      ))}

      {summary.grandTotal && (
        <table className="mt-4 w-full border-collapse text-sm leading-tight">
          <thead>
            <tr>
              <th className={th} rowSpan={2} />
              <th className={th} colSpan={3}>
                Total
              </th>
              {summary.grandTotal.subjectIds.map((id) => (
                <th key={id} className={th} colSpan={2}>
                  {subjectLabel(id)}
                </th>
              ))}
            </tr>
            <tr>
              <th className={th}>Students</th>
              <th className={th}>Failed</th>
              <th className={th}>Absent</th>
              {failedAbsentHeads(summary.grandTotal.subjectIds.length)}
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold">
              <td className={cn(td, "text-right")}>Grand Total=</td>
              {totals(summary.grandTotal, { color: highlight })}
              {summary.grandTotal.subjectIds.flatMap((id) =>
                cells(summary.grandTotal!.subjects.get(id), id, { color: highlight })
              )}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
