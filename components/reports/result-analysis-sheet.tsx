import { ReportHeading } from "@/components/reports/result-summary-sheet"
import type { Branch, Institute } from "@/lib/institutes"
import { analysisPercent, type AnalysisColumn, type ResultAnalysis } from "@/lib/result-analysis"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const range = (r: { min: number; max: number }) => `${r.min}-${r.max}`
const columnTotal = (c: AnalysisColumn) => c.counts.reduce((sum, n) => sum + n, 0) + c.absent

// Legacy Partial/_resultAnalysis ("Subject Result Analysis in Details"): a
// page per subject with the institute heading, the class, group and section,
// the exam and subject, then a row per letter grade — its percentage range,
// the matching marks range and students of each marked part, and the
// subject total's range, grade, students and share — an Absent row and the
// students in each column. Styled as the printed report so the page and
// print match.
export function ResultAnalysisSheet({
  institute,
  branch,
  exam,
  analysis,
  heading,
  subjectName,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  exam: TermExam
  analysis: ResultAnalysis
  // Class (with its group) and section, as the legacy line under the title.
  heading: { class: string; group?: string; section: string }
  subjectName: (id: number) => string
  subjectLabel: (id: number) => string
  className?: string
}) {
  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-1 text-center tabular-nums"
  const { grades } = analysis

  return (
    <div className={cn("flex flex-col gap-8 bg-white font-serif text-black", className)}>
      {analysis.subjects.map((subject) => {
        const { parts, summary, total } = subject
        return (
          <section key={subject.subjectId} className="break-after-page last:break-after-auto">
            <ReportHeading
              institute={institute}
              branch={branch}
              exam={exam}
              title="Subject Result Analysis in Details"
              details={[
                ["Exam", exam.fullName],
                ["Class", heading.class],
                ...(heading.group ? [["Group", heading.group] as [string, string]] : []),
                ["Section", heading.section],
                ["Subject", subjectName(subject.subjectId)],
              ]}
            />

            <table className="mt-3 w-full border-collapse text-sm leading-tight">
              <thead>
                <tr>
                  <th className={th} rowSpan={3}>
                    Sl No.
                  </th>
                  <th className={th} rowSpan={3}>
                    Marks Range
                  </th>
                  {parts.length > 0 && (
                    <th className={th} colSpan={parts.length * 2}>
                      {subjectLabel(subject.subjectId)}
                    </th>
                  )}
                  <th className={th} rowSpan={2} colSpan={4}>
                    Subject Summary
                  </th>
                </tr>
                <tr>
                  {parts.map((p) => (
                    <th key={p.key} className={th} colSpan={2}>
                      {p.label}-{p.full}
                    </th>
                  ))}
                </tr>
                <tr>
                  {parts.flatMap((p) => [
                    <th key={`${p.key}-range`} className={th}>
                      Marks Range
                    </th>,
                    <th key={`${p.key}-count`} className={th}>
                      No.of Std
                    </th>,
                  ])}
                  <th className={th}>Total-{summary.full}</th>
                  <th className={th}>Letter Grade</th>
                  <th className={th}>No.of Std</th>
                  <th className={th}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={g.id} className="break-inside-avoid">
                    <td className={td}>{i + 1}</td>
                    <td className={td}>
                      {g.minMarks}-{g.maxMarks}%
                    </td>
                    {parts.flatMap((p) => [
                      <td key={`${p.key}-range`} className={td}>
                        {range(p.ranges[i])}
                      </td>,
                      <td key={`${p.key}-count`} className={td}>
                        {p.counts[i]}
                      </td>,
                    ])}
                    <td className={td}>{range(summary.ranges[i])}</td>
                    <td className={td}>{g.name}</td>
                    <td className={td}>{summary.counts[i]}</td>
                    <td className={td}>{analysisPercent(summary.counts[i], total)}</td>
                  </tr>
                ))}
                <tr className="break-inside-avoid">
                  <td className={td}>{grades.length + 1}</td>
                  <td className={td}>Absent</td>
                  {parts.flatMap((p) => [
                    <td key={`${p.key}-range`} className={td}>
                      -
                    </td>,
                    <td key={`${p.key}-count`} className={td}>
                      {p.absent}
                    </td>,
                  ])}
                  <td className={td}>-</td>
                  <td className={td}>-</td>
                  <td className={td}>{summary.absent}</td>
                  <td className={td}>{analysisPercent(summary.absent, total)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className={cn(td, "text-right")} colSpan={2}>
                    Total Student=
                  </td>
                  {parts.flatMap((p) => [
                    <td key={`${p.key}-range`} className={td} />,
                    <td key={`${p.key}-count`} className={td}>
                      {columnTotal(p)}
                    </td>,
                  ])}
                  <td className={td} />
                  <td className={td} />
                  <td className={td}>{total}</td>
                  <td className={td} />
                </tr>
              </tfoot>
            </table>
          </section>
        )
      })}
    </div>
  )
}
