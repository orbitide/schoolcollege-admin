import { monthYear, ReportHeading } from "@/components/reports/result-summary-sheet"
import type { Branch, Institute } from "@/lib/institutes"
import { paginate, passFailReportTypes, type PassFailReportType, type PassFailTable } from "@/lib/pass-fail-report"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

// Legacy Partial/_allStudentResultReport: the report cut into pages of
// `rowsPerPage` students, each with the institute heading, the class, group,
// section (and the subject, in a Failed List), the exam and its month, then
// the students — their result, the failed subject's marks, or what they
// failed — signature lines under the All and Passed lists, and "Page x of y".
export function PassFailReportSheet({
  institute,
  branch,
  exam,
  type,
  tables,
  rowsPerPage,
  heading,
  columns,
  subjectName,
  name,
  className,
}: {
  institute: Institute
  branch?: Branch
  exam: TermExam
  type: PassFailReportType
  tables: PassFailTable[]
  rowsPerPage: number
  // Class, its group (when the class has groups) and section, as the legacy line under the title.
  heading: { class: string; group?: string; section: string }
  columns: { mobile: boolean; section: boolean; groupPosition: boolean }
  subjectName: (id: number) => string
  name: (kind: "section", id: number) => string
  className?: string
}) {
  const th = "border border-black px-1.5 py-1 text-center font-semibold"
  const td = "border border-black px-1.5 py-1 text-center tabular-nums"
  const title = passFailReportTypes.find((t) => t.value === type)!.title
  const results = type === "all" || type === "passed"
  const showGroupPosition = results && columns.groupPosition
  const pages = paginate(tables, rowsPerPage)

  return (
    <div className={cn("flex flex-col gap-8 bg-white font-serif text-black", className)}>
      {pages.map((page, pageIndex) => (
        <section key={pageIndex} className="break-after-page last:break-after-auto">
          <ReportHeading
            institute={institute}
            branch={branch}
            exam={exam}
            title={title}
            details={[
              ["Class", heading.class],
              ...(heading.group ? [["Group", heading.group] as [string, string]] : []),
              ["Section", heading.section],
              ...(page.subjectId != null ? [["Subject", subjectName(page.subjectId)] as [string, string]] : []),
              ["Examination Name", exam.fullName],
              ["Date", monthYear(exam.examStart)],
            ]}
          />

          <table className="mt-3 w-full border-collapse text-sm leading-tight">
            <thead>
              <tr>
                <th className={cn(th, "w-10")}>Sl</th>
                {columns.section && <th className={th}>Section</th>}
                <th className={th}>Roll</th>
                <th className={th}>Student Name</th>
                {columns.mobile && <th className={th}>Mobile</th>}
                {type !== "failed-details" && <th className={th}>Total Marks</th>}
                {results && (
                  <>
                    <th className={th}>GPA</th>
                    <th className={th}>Section Position</th>
                    {showGroupPosition && <th className={th}>Group Position</th>}
                  </>
                )}
                {type === "failed" && <th className={th}>Subject Marks</th>}
                {type === "failed-details" && <th className={th}>Result Details</th>}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row, i) => {
                const { result, student } = row
                return (
                  <tr key={`${student.id}-${row.mark?.subjectId ?? ""}`} className="break-inside-avoid">
                    <td className={td}>{page.first + i + 1}</td>
                    {columns.section && <td className={td}>{name("section", result.sectionId)}</td>}
                    <td className={cn(td, "font-bold whitespace-nowrap")}>{result.roll}</td>
                    <td className={cn(td, "text-left text-xs whitespace-nowrap")}>{student.name}</td>
                    {columns.mobile && <td className={td}>{student.primaryMobile}</td>}
                    {type !== "failed-details" && <td className={td}>{result.totalMarks}</td>}
                    {results &&
                      (result.failedSubjectCount === 0 && result.isPresent ? (
                        <>
                          <td className={td}>{result.gpa.toFixed(2)}</td>
                          <td className={td}>{result.sectionPosition}</td>
                          {showGroupPosition && <td className={td}>{result.groupPosition}</td>}
                        </>
                      ) : (
                        <td className={td} colSpan={showGroupPosition ? 3 : 2}>
                          {result.isPresent ? `Failed(${result.failedSubjectCount})` : "Absent"}
                        </td>
                      ))}
                    {type === "failed" && <td className={td}>{row.mark?.total}</td>}
                    {type === "failed-details" && <td className={cn(td, "text-left text-xs")}>{row.details}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {results && (
            <div className="mt-12 grid grid-cols-3 text-center font-bold">
              {["Class Teacher", "Vice-Principal", "Principal"].map((signatory) => (
                <div key={signatory} className="flex flex-col items-center gap-1">
                  <span className="w-40 border-t border-black" />
                  {signatory}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-right text-sm font-bold">
            Page {pageIndex + 1} of {pages.length}
          </p>
        </section>
      ))}
    </div>
  )
}
