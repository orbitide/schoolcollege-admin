import type * as React from "react"
import Link from "next/link"

import type { Institute } from "@/lib/institutes"
import type { ReportFilter } from "@/lib/student-report"
import type { GenderCounts, StudentStatistics } from "@/lib/student-statistics"
import type { Gender } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

type Lookup = (kind: "class" | "section" | "group" | "house" | "subject", id: number | null) => string

const th = "border border-black px-1.5 py-1 text-center font-semibold"
const td = "border border-black px-1.5 py-1 text-center tabular-nums"

// Legacy StudentStatistics.cshtml: the institute heading with the filter it
// counts, then side by side the male / female / total counts per group,
// section, version and house, and the students per subject. A count opens
// those students in the Student Dynamic Report (legacy links to the student
// list), where the report can filter by what the row counts.
export function StudentStatisticsSheet({
  institute,
  stats,
  filterLine,
  classChosen,
  name,
  subjectCode,
  href,
  className,
}: {
  institute: Institute
  stats: StudentStatistics
  // "Class: Nine, Year: 2026", as the legacy line under the title.
  filterLine: [label: string, value: string][]
  // Section rows show their class when the filter doesn't pick one.
  classChosen: boolean
  name: Lookup
  subjectCode: (id: number) => string
  href?: (filter: Partial<ReportFilter>) => string
  className?: string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"

  const count = (value: number, filter: Partial<ReportFilter> | null, gender?: Gender) =>
    href && filter ? (
      <Link href={href({ ...filter, gender: gender ?? "" })} className="underline-offset-2 hover:underline print:no-underline">
        {value}
      </Link>
    ) : (
      value
    )
  const genderCells = (c: GenderCounts, filter: Partial<ReportFilter> | null, cell = td) => (
    <>
      <td className={cell}>{count(c.male, filter, "Male")}</td>
      <td className={cell}>{count(c.female, filter, "Female")}</td>
      <td className={cell}>{count(c.total, filter)}</td>
    </>
  )
  const table = (
    title: string,
    heads: React.ReactNode,
    rows: React.ReactNode,
    totalLabelSpan = 1
  ) => (
    <table className="w-full border-collapse break-inside-avoid">
      <thead>
        <tr>
          <th className={cn(th, "text-left")} colSpan={totalLabelSpan + 3} style={{ color: highlight }}>
            {title}
          </th>
        </tr>
        <tr>
          {heads}
          <th className={cn(th, "w-1/5")}>Male</th>
          <th className={cn(th, "w-1/5")}>Female</th>
          <th className={cn(th, "w-1/5")}>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows}
        <tr className="font-bold">
          <td className={cn(td, "text-left")} colSpan={totalLabelSpan}>
            G. Total
          </td>
          {genderCells(stats.total, {})}
        </tr>
      </tbody>
    </table>
  )
  const notSet = "Not set"

  return (
    <div className={cn("flex flex-col gap-4 bg-white font-serif text-sm text-black", className)}>
      <header className="flex items-center justify-center gap-5">
        <div style={{ width: logoWidth }} className="shrink-0">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt="" className="h-auto w-full" />
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
          <p>{institute.address}</p>
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Student Statistics</h2>
          <p style={{ color: highlight }}>
            {filterLine.map(([label, value], i) => (
              <span key={label}>
                {i > 0 && ", "}
                {label}: <strong>{value}</strong>
              </span>
            ))}
          </p>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>

      <div className="grid grid-cols-[1fr_1fr] items-start gap-4">
        <div className="flex flex-col gap-4">
          {institute.enableGroup &&
            table(
              "Group wise",
              <th className={cn(th, "text-left")}>Group</th>,
              stats.groups.map((g) => (
                <tr key={String(g.groupId)}>
                  <td className={cn(td, "text-left")}>{g.groupId == null ? notSet : name("group", g.groupId)}</td>
                  {genderCells(g.counts, g.groupId == null ? null : { groupId: g.groupId })}
                </tr>
              ))
            )}
          {table(
            "Section wise",
            classChosen ? (
              <th className={cn(th, "text-left")}>Section</th>
            ) : (
              <>
                <th className={cn(th, "text-left")}>Class</th>
                <th className={cn(th, "text-left")}>Section</th>
              </>
            ),
            stats.sections.map((s) => (
              <tr key={`${s.classId}-${s.sectionId}`}>
                {!classChosen && <td className={cn(td, "text-left")}>{name("class", s.classId)}</td>}
                <td className={cn(td, "text-left")}>{s.sectionId == null ? notSet : name("section", s.sectionId)}</td>
                {genderCells(
                  s.counts,
                  s.sectionId == null ? null : { classId: s.classId, sectionId: s.sectionId }
                )}
              </tr>
            )),
            classChosen ? 1 : 2
          )}
          {institute.enableVersion &&
            table(
              "Version wise",
              <th className={cn(th, "text-left")}>Version</th>,
              stats.versions.map((v) => (
                <tr key={v.version}>
                  <td className={cn(td, "text-left")}>{v.version || notSet}</td>
                  {genderCells(v.counts, v.version ? { version: v.version } : null)}
                </tr>
              ))
            )}
          {institute.enableStudentHouse &&
            table(
              `${institute.studentHouseLabel.trim() || "House"} wise`,
              <th className={cn(th, "text-left")}>{institute.studentHouseLabel.trim() || "House"}</th>,
              stats.houses.map((h) => (
                <tr key={String(h.houseId)}>
                  <td className={cn(td, "text-left")}>{h.houseId == null ? notSet : name("house", h.houseId)}</td>
                  {/* The dynamic report has no house filter, so these don't link. */}
                  {genderCells(h.counts, null)}
                </tr>
              ))
            )}
        </div>

        <table className="w-full border-collapse break-inside-avoid">
          <thead>
            <tr>
              <th className={cn(th, "text-left")} colSpan={4} style={{ color: highlight }}>
                Subject wise
              </th>
            </tr>
            <tr>
              <th className={cn(th, "w-1/5")}>SL</th>
              <th className={cn(th, "text-left")}>Subject</th>
              <th className={cn(th, "w-1/5")}>Code</th>
              <th className={cn(th, "w-1/5")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.subjects.map((s, i) => (
              <tr key={s.subjectId}>
                <td className={td}>{i + 1}</td>
                <td className={cn(td, "text-left")}>{name("subject", s.subjectId)}</td>
                <td className={td}>{subjectCode(s.subjectId)}</td>
                <td className={td}>{s.students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
