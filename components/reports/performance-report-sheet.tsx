"use client"

import { UserIcon } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import type { PerformanceReport } from "@/lib/performance-report"
import { subjectKinds, tabulationParts, type TabulationCell } from "@/lib/tabulation"
import type { Teacher } from "@/lib/teachers"
import { cn, parseInlineStyle } from "@/lib/utils"

const td = "border border-black px-1 py-0.5 text-center tabular-nums"
const failedCls = (cell: TabulationCell) => (cell.failed ? "text-red-600 underline" : undefined)

// Legacy Partial/_performanceReport: the institute heading and class, the
// student's details beside a GPA line (board exams, then each exam that
// calculates GPA), then per exam its term result and a row per marked part
// (lettered A, B, …) and the subject totals. A failed exam's short marks are
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
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const { student, enrolment, exams, subjects } = report
  const kinds = subjectKinds
    .map((k) => ({ ...k, count: subjects.filter((s) => s.kind === k.key).length }))
    .filter((k) => k.count > 0)
  const grouped = kinds.length > 1

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
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Performance Report</h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <p className="flex items-center justify-center gap-2 text-[15px]">
        Class:
        <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
          {academicClass.name}
        </strong>
      </p>

      <div className="grid grid-cols-2 items-start gap-4">
        <table className="w-full border-collapse">
          <tbody>
            {details.map(([label, value], i) => (
              <tr key={label}>
                {i === 0 && (
                  <td className={cn(td, "w-[28%] align-top")} rowSpan={details.length}>
                    <div className="mx-auto flex aspect-[82/90] w-full max-w-[110px] items-center justify-center">
                      {student.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={student.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <UserIcon className="size-12 text-neutral-400" aria-hidden />
                      )}
                    </div>
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

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={cn(td, "w-[10%] align-bottom")} rowSpan={grouped ? 2 : 1}>
              Exam Name
            </th>
            <th className={cn(td, "w-[6%] align-bottom")} rowSpan={grouped ? 2 : 1}>
              Term Result
            </th>
            <th className={cn(td, "w-[14%] align-bottom")} rowSpan={grouped ? 2 : 1} colSpan={2}>
              Type
            </th>
            {grouped
              ? kinds.map((k) => (
                  <th key={k.key} className={cn(td, "font-normal")} colSpan={k.count}>
                    {k.key === "optional" ? "Optional" : k.label.replace(" Subject", "")}
                  </th>
                ))
              : subjects.map((s) => (
                  <th key={s.subjectId} className={td}>
                    {subjectLabel(s.subjectId)}
                  </th>
                ))}
          </tr>
          {grouped && (
            <tr>
              {subjects.map((s) => (
                <th key={s.subjectId} className={td}>
                  {subjectLabel(s.subjectId)}
                </th>
              ))}
            </tr>
          )}
        </thead>
        {exams.map(({ exam, result, row }) => {
          const own = new Map(row.subjects.map((s) => [s.subjectId, s]))
          const rows = [...row.parts, null]
          return (
            <tbody key={exam.id} className="break-inside-avoid border-b-2 border-black">
              {rows.map((part, r) => {
                const letter = String.fromCharCode(65 + r)
                return (
                  <tr key={part ?? "total"} className={cn(part == null && "font-bold")}>
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
                      <td className={cn(td, "w-6")}>{letter}</td>
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
                )
              })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
