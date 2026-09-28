import { Fragment } from "react"

import { monthYear, ReportHeading, spanAt } from "@/components/reports/result-summary-sheet"
import type { AbsentSummary } from "@/lib/absent-summary"
import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

// Legacy Partial/_absentSummaryDetailsAll: the institute heading, the exam,
// class and result month, then a table per group — a block per section (its
// group, version, name and head count beside a row per marked part and the
// "All" row), the subjects as columns — closed by the absent totals.
export function AbsentSummarySheet({
  institute,
  branch,
  academicClass,
  exam,
  summary,
  withoutOptional,
  showGroup,
  name,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  summary: AbsentSummary
  withoutOptional: boolean
  showGroup: boolean
  name: (kind: "section" | "group", id: number | null) => string
  subjectLabel: (id: number) => string
  className?: string
}) {
  const highlight = institute.configuration.reportHighlightColor.trim() || undefined
  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-0.5 text-center tabular-nums"
  // A block per section: a row per part, then "All".
  const blockRows = summary.parts.length + 1
  const leading = 2 + Number(showGroup) + Number(institute.enableVersion)

  return (
    <div className={cn("flex flex-col gap-6 bg-white font-serif text-black", className)}>
      <ReportHeading
        institute={institute}
        branch={branch}
        exam={exam}
        title={`Subject wise absent Statistics ${withoutOptional ? "(Without Optional)" : "(With Optional)"}`}
        details={[
          ["Exam Name", exam.name],
          ["Class", academicClass?.name ?? "—"],
          ["Exam Date", monthYear(exam.resultPublish)],
        ]}
      />

      {summary.tables.map((table) => (
        <table key={String(table.groupId)} className="w-full border-collapse text-sm leading-tight break-inside-avoid">
          <thead>
            <tr>
              {showGroup && <th className={th}>Group</th>}
              {institute.enableVersion && <th className={th}>Version</th>}
              <th className={th}>Section</th>
              <th className={th}>Student</th>
              <th className={th} />
              {table.subjectIds.map((id) => (
                <th key={id} className={th}>
                  {subjectLabel(id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => {
              const versionSpan = spanAt(table.rows, index, (r) => r.version)
              return (
                <Fragment key={row.sectionId}>
                  {[...summary.parts, null].map((part, r) => (
                    <tr key={part ?? "all"} className={cn(part == null && "font-bold")}>
                      {r === 0 && (
                        <>
                          {showGroup && index === 0 && (
                            <td className={td} rowSpan={table.rows.length * blockRows}>
                              {table.groupId != null ? name("group", table.groupId) : "—"}
                            </td>
                          )}
                          {institute.enableVersion && versionSpan > 0 && (
                            <td className={td} rowSpan={versionSpan * blockRows}>
                              {row.version || "—"}
                            </td>
                          )}
                          <td className={td} rowSpan={blockRows}>
                            {name("section", row.sectionId)}
                          </td>
                          <td className={td} rowSpan={blockRows}>
                            {row.total}
                          </td>
                        </>
                      )}
                      <td className={cn(td, "text-xs")}>{part ?? "All"}</td>
                      {table.subjectIds.map((id) => {
                        const counts = row.subjects.get(id)
                        const value = part == null ? (counts?.all ?? 0) : counts?.parts[part]
                        return (
                          <td key={id} className={td}>
                            {value ?? "-"}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className={cn(td, "text-right")} colSpan={leading - 1}>
                Total=
              </td>
              <td className={td} style={{ color: highlight }}>
                {table.absent} / {table.total}
              </td>
              <td className={td} />
              {table.subjectIds.map((id) => (
                <td key={id} className={td} style={{ color: highlight }}>
                  {table.subjectAbsent.get(id) ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      ))}
    </div>
  )
}
