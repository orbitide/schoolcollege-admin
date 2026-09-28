import type * as React from "react"

import { monthYear, ReportHeading } from "@/components/reports/result-summary-sheet"
import type { AcademicClass, Branch, Institute, Section } from "@/lib/institutes"
import {
  paginateTabulation,
  subjectKinds,
  tabulationParts,
  type Tabulation,
  type TabulationCell,
  type TabulationPart,
  type TabulationStudent,
} from "@/lib/tabulation"
import type { Teacher } from "@/lib/teachers"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Cell = { content: React.ReactNode; rowSpan?: number; className?: string }

const partLabel = (key: TabulationPart) => tabulationParts.find((p) => p.key === key)!.label
const failedCls = (cell: TabulationCell) => (cell.failed ? "text-red-600 underline" : undefined)

// A student's block of rows (legacy _tabulation): the subjects' short names,
// a row per marked part, then the totals. Beside them, the roll and result
// fill the upper rows (names, theory, CQ); the name and position in the
// section fill the rest, with the board GPA in the total row.
function studentRows(
  std: TabulationStudent,
  sl: number,
  spans: Record<(typeof subjectKinds)[number]["key"], number>,
  subjectLabel: (id: number) => string
): Cell[][] {
  const kinds = subjectKinds.filter((k) => spans[k.key] > 0)
  // Each block's subjects, padded with "-" to the page's widest.
  const columns = (cell: (sub: TabulationStudent["subjects"][number]) => Cell) =>
    kinds.flatMap((k) => {
      const own = std.subjects.filter((s) => s.kind === k.key).map(cell)
      return [...own, ...Array.from({ length: spans[k.key] - own.length }, () => ({ content: "-" }))]
    })

  const upper = 1 + std.parts.filter((p) => p === "theory" || p === "cq").length
  const lower = std.parts.length + 2 - upper
  // The board GPA gets its own cell in the total row only when the name has rows above it.
  const gpaApart = !!std.previousGpa && lower > 1
  const label = "text-xs"

  const head: Cell[] = [
    { content: sl, rowSpan: std.parts.length + 2 },
    { content: std.result.roll, rowSpan: upper, className: "text-base font-bold text-[#0484BD]" },
    { content: std.resultText, rowSpan: upper, className: "font-bold" },
    { content: "" },
    ...columns((s) => ({ content: subjectLabel(s.subjectId), className: "text-xs font-bold" })),
  ]
  const nameCells: Cell[] = [
    {
      content: (
        <>
          {std.student.name}
          {!gpaApart && std.previousGpa && <span className="block">{std.previousGpa}</span>}
        </>
      ),
      rowSpan: lower - (gpaApart ? 1 : 0),
      className: "text-[11px]",
    },
    {
      content: (
        <>
          Position
          <br />
          in Sec.
          <br />
          {std.passed ? std.result.sectionPosition : "-"}
        </>
      ),
      rowSpan: lower,
    },
  ]
  const parts = std.parts.map((part): Cell[] => [
    { content: partLabel(part), className: label },
    ...columns((s) => {
      const cell = s.parts[part]
      return cell ? { content: cell.text, className: cn("font-bold", failedCls(cell)) } : { content: "-" }
    }),
  ])
  const total: Cell[] = [
    ...(gpaApart ? [{ content: std.previousGpa, className: "text-[11px]" }] : []),
    { content: "Total", className: label },
    ...columns((s) => ({ content: s.total.text, className: cn("font-bold", failedCls(s.total)) })),
  ]

  const rows = [head, ...parts, total]
  rows[upper] = [...nameCells, ...rows[upper]]
  return rows
}

// Legacy Partial/_tabulation: the section's students cut into pages of
// `studentsPerPage`, each with the institute heading, the class teacher, the
// exam, class, group, section and head counts, then a block of rows per
// student, and "Page x of y". A failed student's short marks are red and
// underlined.
export function TabulationSheet({
  institute,
  branch,
  academicClass,
  section,
  exam,
  tabulation,
  studentsPerPage,
  teacher,
  groupName,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  section: Section
  exam: TermExam
  tabulation: Tabulation
  studentsPerPage: number
  teacher?: Teacher
  groupName?: string
  subjectLabel: (id: number) => string
  className?: string
}) {
  const pages = paginateTabulation(tabulation.students, studentsPerPage)
  const total = tabulation.students.length
  const td = "border border-black p-0.5 text-center align-middle tabular-nums"
  const counts: [string, React.ReactNode][][] = [
    [
      ["Exam Name", exam.name],
      ["Class", academicClass?.name ?? "—"],
      ["Exam Held", monthYear(exam.examStart)],
    ],
    [
      ["Group", groupName ?? "-"],
      ["", null],
      ["Section", section.name],
    ],
    [
      ["Total Student", total],
      ["Total Passed", tabulation.passed],
      ["Total Failed", total - tabulation.passed],
    ],
  ]

  return (
    <div className={cn("flex flex-col gap-8 bg-white font-serif text-black", className)}>
      {pages.map((page, pageIndex) => {
        const kinds = subjectKinds.filter((k) => page.spans[k.key] > 0)
        return (
          <section key={pageIndex} className="break-after-page last:break-after-auto">
            <ReportHeading institute={institute} branch={branch} exam={exam} title="Tabulation Sheet" details={[]} />

            <div className="flex justify-between gap-4 px-1 text-[15px]">
              <span>
                Class Teacher: <strong>{teacher?.name}</strong>
              </span>
              <span>
                Mobile: <strong>{teacher?.mobile}</strong>
              </span>
            </div>
            <div className="mb-1 grid grid-cols-3 gap-y-0.5 border border-black p-1.5 text-[15px]">
              {counts.flat().map(([name, value], i) => (
                <span key={i} className={["text-left", "text-center", "text-right"][i % 3]}>
                  {name && (
                    <>
                      {name}: <strong>{value}</strong>
                    </>
                  )}
                </span>
              ))}
            </div>

            <table className="w-full border-collapse text-sm leading-tight">
              <thead>
                <tr>
                  <th className={cn(td, "w-[4%]")}>Sl.</th>
                  <th className={cn(td, "w-[15%]")}>Roll &amp; Name</th>
                  <th className={cn(td, "w-[8%]")}>Result</th>
                  <th className={cn(td, "w-[4%]")} />
                  {kinds.map((k) => (
                    <th key={k.key} className={td} colSpan={page.spans[k.key]}>
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              {page.students.map((std, i) => (
                <tbody key={std.student.id} className="break-inside-avoid border-t-2 border-black">
                  {studentRows(std, page.first + i + 1, page.spans, subjectLabel).map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          rowSpan={cell.rowSpan}
                          className={cn(td, r === 0 && "border-t-2", cell.className)}
                        >
                          {cell.content}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>

            <p className="mt-3 text-right text-sm font-bold">
              Page {pageIndex + 1} of {pages.length}
            </p>
          </section>
        )
      })}
    </div>
  )
}
