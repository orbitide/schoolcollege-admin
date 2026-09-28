import type * as React from "react"

import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import { passPercent, type ResultCounts, type ResultSummary, type ResultSummaryRow } from "@/lib/result-summary"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

// "Jun-2026", as the legacy ExamStart.ToString("MMM-yyyy").
export const monthYear = (iso: string) => {
  const [y, m] = iso.split("-").map(Number)
  return `${new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })}-${y}`
}

// How many rows from `index` share its key, or 0 when the row above already
// spans it (a rowSpan cell is drawn once, on the first row).
export function spanAt<T>(rows: T[], index: number, key: (row: T) => string) {
  if (index > 0 && key(rows[index - 1]) === key(rows[index])) return 0
  let span = 1
  while (index + span < rows.length && key(rows[index + span]) === key(rows[index])) span++
  return span
}

// The institute heading every exam report opens with: logo, name and
// address, the report title, then the exam, class and exam month — or the
// report's own `details`.
export function ReportHeading({
  institute,
  branch,
  academicClass,
  exam,
  title,
  details,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  title: string
  details?: [label: string, value: string][]
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  return (
    <>
      <header className="flex items-center justify-center gap-5">
        <div style={{ width: logoWidth }} className="shrink-0">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt="" className="h-auto w-full" />
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
          <p className="text-sm">{branch?.address || institute.address}</p>
          <h2 style={parseInlineStyle(config.reportNameStyle)}>{title}</h2>
        </div>
        {/* Balances the logo so the heading stays centred. */}
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[15px]">
        {(
          details ?? [
            ["Exam Name", exam.fullName],
            ["Class", academicClass?.name ?? "—"],
            ["Exam Date", monthYear(exam.examStart)],
          ]
        ).map(([label, value]) => (
          <span key={label} className="flex items-center gap-2">
            {label}:
            <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
              {value}
            </strong>
          </span>
        ))}
      </div>
    </>
  )
}

// Legacy Partial/_resultSummary ("Result Statistics at a glance"): the
// institute heading, the exam, class and exam month, then a row per section
// — under its branch, medium, group and version where the institute uses
// them — with the passes per GPA grade when the exam calculates GPA, and a
// total row. Styled as the printed report so the page and print match.
export function ResultSummarySheet({
  institute,
  branch,
  academicClass,
  exam,
  summary,
  name,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  summary: ResultSummary
  name: (kind: "section" | "group", id: number | null) => string
  className?: string
}) {
  const highlight = institute.configuration.reportHighlightColor.trim() || undefined
  const showGroup = institute.enableGroup && !!academicClass?.hasSubjectGroup
  const showGrades = exam.calculateGpa && summary.grades.length > 0
  const { rows, total } = summary
  const leading = [institute.enableBranch, institute.enableMedium, showGroup, institute.enableVersion].filter(
    Boolean
  ).length

  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-1 text-center tabular-nums"
  const counts = (c: ResultCounts, cellClass: string, style?: React.CSSProperties) => [
    <td key="total" className={cellClass} style={style}>
      {c.total}
    </td>,
    <td key="appeared" className={cellClass} style={style}>
      {c.appeared}
    </td>,
    ...(showGrades
      ? c.grades.map((count, i) => (
          <td key={`grade-${i}`} className={cellClass}>
            {count}
          </td>
        ))
      : []),
    <td key="passed" className={cellClass} style={style}>
      {c.passed}
    </td>,
    <td key="failed" className={cellClass} style={style}>
      {c.failed}
    </td>,
    <td key="absent" className={cellClass} style={style}>
      {c.absent}
    </td>,
  ]
  const groupKey = (r: ResultSummaryRow) => String(r.groupId)
  const versionKey = (r: ResultSummaryRow) => `${r.groupId}|${r.version}`

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      <ReportHeading
        institute={institute}
        branch={branch}
        academicClass={academicClass}
        exam={exam}
        title="Result Statistics at a glance"
      />

      <table className="mt-3 w-full border-collapse text-sm leading-tight">
        <thead>
          <tr>
            {institute.enableBranch && (
              <th className={th} rowSpan={2}>
                Branch
              </th>
            )}
            {institute.enableMedium && (
              <th className={th} rowSpan={2}>
                Medium
              </th>
            )}
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
            <th className={th} rowSpan={2}>
              Total Student
            </th>
            <th className={th} rowSpan={2}>
              Total Appeared
            </th>
            {showGrades && (
              <th className={th} colSpan={summary.grades.length}>
                Pass With GPA
              </th>
            )}
            <th className={th} rowSpan={2}>
              Total Passed
            </th>
            <th className={th} rowSpan={2}>
              Total Failed
            </th>
            <th className={th} rowSpan={2}>
              Total Absent
            </th>
            <th className={th} rowSpan={2}>
              Passed Percentage
            </th>
          </tr>
          <tr>
            {showGrades &&
              summary.grades.map((g) => (
                <th key={g.id} className={th}>
                  {g.name}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const groupSpan = spanAt(rows, index, groupKey)
            const versionSpan = spanAt(rows, index, versionKey)
            return (
              <tr key={row.sectionId} className="break-inside-avoid">
                {index === 0 && institute.enableBranch && (
                  <td className={td} rowSpan={rows.length}>
                    {exam.branchId != null ? (branch?.name ?? "—") : "All Branch"}
                  </td>
                )}
                {index === 0 && institute.enableMedium && (
                  <td className={td} rowSpan={rows.length}>
                    {exam.medium || "All Medium"}
                  </td>
                )}
                {showGroup && groupSpan > 0 && (
                  <td className={td} rowSpan={groupSpan}>
                    {name("group", row.groupId)}
                  </td>
                )}
                {institute.enableVersion && versionSpan > 0 && (
                  <td className={td} rowSpan={versionSpan}>
                    {row.version || "—"}
                  </td>
                )}
                <td className={td}>{name("section", row.sectionId)}</td>
                {counts(row, td)}
                <td className={td}>{passPercent(row).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className={cn(td, "text-right")} colSpan={leading + 1}>
              Total=
            </td>
            {counts(total, td, { color: highlight })}
            <td className={td} style={{ color: highlight }}>
              {passPercent(total).toFixed(2).padStart(5, "0")}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
