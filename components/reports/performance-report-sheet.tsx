"use client"

import type * as React from "react"
import { UserIcon } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import type { PerformanceReport } from "@/lib/performance-report"
import { subjectKinds, tabulationParts, type TabulationCell } from "@/lib/tabulation"
import type { Teacher } from "@/lib/teachers"
import { cn, parseInlineStyle } from "@/lib/utils"

const td = "border border-black px-1 py-0.5 text-center tabular-nums"
const failedCls = (cell: TabulationCell) => (cell.failed ? "text-red-600 underline" : undefined)

function StudentPhoto({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("mx-auto flex aspect-[82/90] w-full items-center justify-center", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <UserIcon className="size-12 text-neutral-400" aria-hidden />
      )}
    </div>
  )
}

// The heading both reports open with: the institute, the title and the class.
function ReportHeader({
  institute,
  branch,
  academicClass,
  title,
}: {
  institute: Institute
  branch?: Branch
  academicClass: AcademicClass
  title: string
}) {
  const config = institute.configuration
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
          <p>{branch?.address || institute.address}</p>
          <h2 style={parseInlineStyle(config.reportNameStyle)}>{title}</h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <p className="flex items-center justify-center gap-2 text-[15px]">
        Class:
        <strong
          className="border border-black px-3 py-0.5"
          style={{ color: config.reportHighlightColor.trim() || undefined }}
        >
          {academicClass.name}
        </strong>
      </p>
    </>
  )
}

// Per exam: its name and term result, a lettered row (A, B, …) per marked
// part and the subject totals. `lead` puts columns before the exams (the
// Year Book's roll and name), filled once beside all the rows.
function ExamMarksTable({
  report,
  subjectLabel,
  lead,
}: {
  report: PerformanceReport
  subjectLabel: (id: number) => string
  lead?: { heads: string[]; cells: { content: React.ReactNode; className?: string }[] }
}) {
  const { exams, subjects } = report
  const kinds = subjectKinds
    .map((k) => ({ ...k, count: subjects.filter((s) => s.kind === k.key).length }))
    .filter((k) => k.count > 0)
  const grouped = kinds.length > 1
  // With `lead`, the heads take two rows (legacy "Student Information" over them).
  const twoRows = grouped || !!lead
  const totalRows = exams.reduce((sum, e) => sum + e.row.parts.length + 1, 0)
  const head = (label: string, className?: string) => (
    <th key={label} className={cn(td, "align-bottom", className)} rowSpan={lead ? 1 : twoRows ? 2 : 1}>
      {label}
    </th>
  )

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {lead ? (
            <th className={td} colSpan={lead.heads.length + 2}>
              Student Information
            </th>
          ) : (
            <>
              {head("Exam Name", "w-[10%]")}
              {head("Term Result", "w-[6%]")}
            </>
          )}
          <th className={cn(td, "w-[14%] align-bottom")} rowSpan={twoRows ? 2 : 1} colSpan={2}>
            Type
          </th>
          {grouped
            ? kinds.map((k) => (
                <th key={k.key} className={cn(td, "font-normal")} colSpan={k.count}>
                  {k.key === "optional" ? "Optional" : k.label.replace(" Subject", "")}
                </th>
              ))
            : subjects.map((s) => (
                <th key={s.subjectId} className={td} rowSpan={twoRows ? 2 : 1}>
                  {subjectLabel(s.subjectId)}
                </th>
              ))}
        </tr>
        {twoRows && (
          <tr>
            {lead && [...lead.heads, "Exam Name", "Term Result"].map((label) => head(label))}
            {grouped &&
              subjects.map((s) => (
                <th key={s.subjectId} className={td}>
                  {subjectLabel(s.subjectId)}
                </th>
              ))}
          </tr>
        )}
      </thead>
      {exams.map(({ exam, result, row }, e) => {
        const own = new Map(row.subjects.map((s) => [s.subjectId, s]))
        const rows = [...row.parts, null]
        return (
          <tbody key={exam.id} className="break-inside-avoid border-b-2 border-black">
            {rows.map((part, r) => (
              <tr key={part ?? "total"} className={cn(part == null && "font-bold")}>
                {lead &&
                  e === 0 &&
                  r === 0 &&
                  lead.cells.map((cell, c) => (
                    <td key={c} className={cn(td, "align-top", cell.className)} rowSpan={totalRows}>
                      {cell.content}
                    </td>
                  ))}
                {r === 0 && (
                  <>
                    <td className={cn(td, "font-bold")} rowSpan={rows.length}>
                      {exam.name}
                    </td>
                    <td className={cn(td, "font-bold")} rowSpan={rows.length}>
                      {exam.calculateGpa ? result.gpa.toFixed(2) : result.totalMarks}
                    </td>
                  </>
                )}
                <td className={td}>{part ? tabulationParts.find((p) => p.key === part)!.label : "Total"}</td>
                <td className={cn(td, "w-6")}>{String.fromCharCode(65 + r)}</td>
                {subjects.map((s) => {
                  const sub = own.get(s.subjectId)
                  const cell = sub && (part ? sub.parts[part] : sub.total)
                  return (
                    <td key={s.subjectId} className={cn(td, cell && failedCls(cell))}>
                      {cell?.text ?? ""}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        )
      })}
    </table>
  )
}

// Legacy Partial/_performanceReport: the institute heading and class, the
// student's details beside a GPA line (board exams, then each exam that
// calculates GPA), then the exams' marks. A failed exam's short marks are
// red and underlined.
export function PerformanceReportSheet({
  institute,
  branch,
  academicClass,
  report,
  sectionName,
  teacher,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass: AcademicClass
  report: PerformanceReport
  sectionName: string
  teacher?: Teacher
  subjectLabel: (id: number) => string
  className?: string
}) {
  const { student, enrolment, exams } = report
  const details: [string, string][] = [
    ["Name", student.name],
    ["Roll", enrolment.classRoll],
    ["Section", sectionName],
    // Newest board exam first, as the legacy lists them.
    ...[...report.boardGpas].reverse().map((b): [string, string] => [`${b.label} GPA`, b.gpa]),
    ["Father", student.fatherName],
    ["Father Mobile", student.fatherMobile],
    ["Mother", student.motherName],
    ["Mother Mobile", student.motherMobile],
    ["Teacher", teacher?.name ?? ""],
    ["Teacher Mobile", teacher?.mobile ?? ""],
  ]
  const points = [
    ...report.boardGpas.map((b) => ({ name: b.label, gpa: Number(b.gpa) })),
    ...exams.filter((e) => e.exam.calculateGpa).map((e) => ({ name: e.exam.name, gpa: e.result.gpa })),
  ].filter((p) => Number.isFinite(p.gpa))

  return (
    <div className={cn("flex flex-col gap-3 bg-white font-serif text-sm text-black", className)}>
      <ReportHeader institute={institute} branch={branch} academicClass={academicClass} title="Performance Report" />

      <div className="grid grid-cols-2 items-start gap-4">
        <table className="w-full border-collapse">
          <tbody>
            {details.map(([label, value], i) => (
              <tr key={label}>
                {i === 0 && (
                  <td className={cn(td, "w-[28%] align-top")} rowSpan={details.length}>
                    <StudentPhoto src={student.imageUrl} className="max-w-[110px]" />
                  </td>
                )}
                <td className={cn(td, "text-right")}>{label}</td>
                <td className={cn(td, "text-left")}>{value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <figure className="flex flex-col items-center gap-1">
          <figcaption className="font-bold">GPA</figcaption>
          {points.length > 0 ? (
            // A fixed size: the printed copy renders while hidden, where a
            // responsive chart would measure 0.
            <LineChart width={340} height={210} data={points} margin={{ top: 18, right: 16, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke="#d4d4d4" />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#000" }} tick={{ fill: "#000", fontSize: 11 }} interval={0} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fill: "#000", fontSize: 11 }} />
              <Tooltip
                cursor={{ stroke: "#737373", strokeDasharray: "3 3" }}
                formatter={(value) => [Number(value).toFixed(2), "GPA"]}
                contentStyle={{ fontSize: 12, borderColor: "#000" }}
              />
              <Line
                type="linear"
                dataKey="gpa"
                stroke="#000"
                strokeWidth={2}
                dot={{ r: 4, fill: "#000", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              >
                <LabelList dataKey="gpa" position="top" fontSize={11} fill="#000" formatter={(v) => Number(v).toFixed(2)} />
              </Line>
            </LineChart>
          ) : (
            <p className="text-xs">No GPA to plot.</p>
          )}
        </figure>
      </div>

      <ExamMarksTable report={report} subjectLabel={subjectLabel} />
    </div>
  )
}

// Legacy Partial/_yearBookReport: a page per student — the institute heading
// and class, then their exams' marks with the roll, section and board GPAs
// and the name and photo in front — and "Page x of y".
export function YearBookSheet({
  institute,
  branch,
  academicClass,
  reports,
  sectionName,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass: AcademicClass
  reports: PerformanceReport[]
  sectionName: string
  subjectLabel: (id: number) => string
  className?: string
}) {
  const highlight = institute.configuration.reportHighlightColor.trim() || undefined
  return (
    <div className={cn("flex flex-col gap-10 bg-white font-serif text-sm text-black", className)}>
      {reports.map((report, i) => (
        <section key={report.student.id} className="flex break-after-page flex-col gap-3 last:break-after-auto">
          <ReportHeader institute={institute} branch={branch} academicClass={academicClass} title="Year Book" />
          <ExamMarksTable
            report={report}
            subjectLabel={subjectLabel}
            lead={{
              heads: ["Roll No.", "Student Name & Image"],
              cells: [
                {
                  className: "w-[9%]",
                  content: (
                    <div className="flex flex-col gap-1.5">
                      <strong className="text-sm" style={{ color: highlight }}>
                        {report.enrolment.classRoll}
                      </strong>
                      {[
                        ["Section", sectionName],
                        ...[...report.boardGpas].reverse().map((b) => [`${b.label} GPA`, b.gpa]),
                      ].map(([label, value]) => (
                        <span key={label}>
                          {label}
                          <strong className="block">{value}</strong>
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  className: "w-[14%]",
                  content: (
                    <div className="flex flex-col gap-1.5">
                      <span>{report.student.name}</span>
                      <StudentPhoto src={report.student.imageUrl} className="max-w-[120px]" />
                    </div>
                  ),
                },
              ],
            }}
          />
          <p className="text-right font-bold">
            Page {i + 1} of {reports.length}
          </p>
        </section>
      ))}
    </div>
  )
}
