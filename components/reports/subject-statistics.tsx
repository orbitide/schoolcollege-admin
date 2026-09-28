"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, DownloadIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { spanAt } from "@/components/reports/result-summary-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  branchStore,
  classStore,
  classYearSubjectStore,
  groupStore,
  sectionStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, type AcademicClass, type Institute } from "@/lib/institutes"
import { downloadCsv } from "@/lib/sms-messages"
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS_PER_PAGE,
  DEFAULT_TITLE,
  encodeConfig,
  type ReportFilter,
} from "@/lib/student-report"
import { subjectStatistics, type SubjectStatistics } from "@/lib/subject-statistics"
import { useStudents } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

const th = "border border-black px-1.5 py-1 text-center font-semibold"
const td = "border border-black px-1.5 py-1 text-center tabular-nums"

// Legacy Partial/_subjectStatistics: the institute heading and class, a
// table per group — a row per section under its version, its students and
// how many take each subject, the subject enrolments added up, and the
// group's totals — then the grand totals. A student count opens those
// students in the Student Dynamic Report (legacy links to the student list).
function SubjectStatisticsSheet({
  institute,
  academicClass,
  stats,
  withoutOptional,
  showGroup,
  name,
  subjectLabel,
  href,
}: {
  institute: Institute
  academicClass: AcademicClass
  stats: SubjectStatistics
  withoutOptional: boolean
  showGroup: boolean
  name: (kind: "section" | "group", id: number | null) => string
  subjectLabel: (id: number) => string
  href?: (filter: Partial<ReportFilter>) => string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const showVersion = institute.enableVersion
  const lead = 1 + Number(showGroup) + Number(showVersion)
  const count = (value: number, filter: Partial<ReportFilter>) =>
    href ? (
      <Link href={href(filter)} className="underline-offset-2 hover:underline print:no-underline">
        {value}
      </Link>
    ) : (
      value
    )

  return (
    <div className="flex flex-col gap-4 bg-white font-serif text-sm text-black">
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
          <h2 style={parseInlineStyle(config.reportNameStyle)}>
            Section wise Subject Statistics ({withoutOptional ? "Without Optional" : "With Optional"})
          </h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>
      <p className="flex items-center justify-center gap-2 text-[15px]">
        Class:
        <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
          {academicClass.name}
        </strong>
      </p>

      {stats.tables.map((table) => (
        <table key={String(table.groupId)} className="w-full border-collapse break-inside-avoid">
          <thead>
            <tr>
              {showGroup && <th className={th}>Group</th>}
              {showVersion && <th className={th}>Version</th>}
              <th className={th}>Section</th>
              <th className={th}>Total Student</th>
              {table.subjectIds.map((id) => (
                <th key={id} className={th}>
                  {subjectLabel(id)}
                </th>
              ))}
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const versionSpan = spanAt(table.rows, i, (r) => r.version)
              return (
                <tr key={row.sectionId}>
                  {showGroup && i === 0 && (
                    <td className={td} rowSpan={table.rows.length}>
                      {table.groupId != null ? name("group", table.groupId) : "—"}
                    </td>
                  )}
                  {showVersion && versionSpan > 0 && (
                    <td className={td} rowSpan={versionSpan}>
                      {row.version || "—"}
                    </td>
                  )}
                  <td className={td}>{name("section", row.sectionId)}</td>
                  <td className={td}>
                    {count(row.students, { sectionId: row.sectionId, ...(showGroup ? { groupId: table.groupId } : {}) })}
                  </td>
                  {table.subjectIds.map((id) => (
                    <td key={id} className={td}>
                      {row.subjects.get(id) ?? 0}
                    </td>
                  ))}
                  <td className={td}>{row.enrolments}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold" style={{ color: highlight }}>
              <td className={cn(td, "text-right")} colSpan={lead}>
                Total=
              </td>
              <td className={td}>{count(table.students, showGroup ? { groupId: table.groupId } : {})}</td>
              {table.subjectIds.map((id) => (
                <td key={id} className={td}>
                  {table.subjects.get(id) ?? 0}
                </td>
              ))}
              <td className={td}>{table.enrolments}</td>
            </tr>
          </tfoot>
        </table>
      ))}

      <table className="w-full border-collapse break-inside-avoid">
        <thead>
          <tr>
            <th className={th} />
            <th className={th}>Total Students</th>
            {stats.subjectIds.map((id) => (
              <th key={id} className={th}>
                {subjectLabel(id)}
              </th>
            ))}
            <th className={th}>All Subjects</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-bold" style={{ color: highlight }}>
            <td className={cn(td, "text-right text-black")}>Grand Total=</td>
            <td className={td}>{count(stats.students, {})}</td>
            {stats.subjectIds.map((id) => (
              <td key={id} className={td}>
                {stats.subjects.get(id) ?? 0}
              </td>
            ))}
            <td className={td}>{stats.enrolments}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// Legacy RptStudent/SubjectStatistics: pick a class and year (branch and
// medium where the institute uses them) and see, per section, how many
// students take each subject — with or without each student's optional
// subject. The filters live in the URL.
export function SubjectStatisticsReport() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute =
    institutes.length === 1 ? institutes[0] : institutes.find((i) => String(i.id) === param("institute"))
  const iid = institute?.id ?? -1
  const branches = branchStore.useList(iid)
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const sets = classYearSubjectStore.useList(iid)

  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const branch = institute?.enableBranch ? branches.find((b) => String(b.id) === param("branch")) : undefined
  const medium = institute?.enableMedium ? param("medium") : ""
  const withoutOptional = param("optional") === "without"
  const showGroup = !!institute?.enableGroup && !!academicClass?.hasSubjectGroup

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    if (institute) params.set("institute", String(institute.id))
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const rank = (list: { id: number; rank: number }[]) => new Map(list.map((r) => [r.id, r.rank]))
  const stats =
    institute && academicClass && year
      ? subjectStatistics(
          institute,
          students,
          sets,
          {
            classId: academicClass.id,
            yearId: year.id,
            branchId: branch?.id ?? null,
            medium,
            withoutOptional,
            byGroup: showGroup,
          },
          { group: rank(groups), section: rank(sections), subject: rank(subjects) }
        )
      : undefined

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || byId.get(id)?.name || name("subject", id)

  // A student count opens its students in the Student Dynamic Report.
  const href = (row: Partial<ReportFilter>) => {
    if (!institute || !year || !academicClass) return "/students/report"
    return `/students/report?q=${encodeConfig({
      filter: {
        instituteId: institute.id,
        branchId: branch?.id ?? null,
        medium,
        classId: academicClass.id,
        yearId: year.id,
        status: "all",
        ...row,
      },
      columns: DEFAULT_COLUMNS,
      orientation: "portrait",
      title: DEFAULT_TITLE,
      extraFields: [],
      rowsPerPage: DEFAULT_ROWS_PER_PAGE,
      signatures: ["Class Teacher", "Vice-Principal", "Principal"],
    })}`
  }

  function exportCsv() {
    if (!stats || !academicClass) return
    const lead = (group: string, version: string) => [
      ...(showGroup ? [group] : []),
      ...(institute?.enableVersion ? [version] : []),
    ]
    downloadCsv(
      `subject-statistics-${withoutOptional ? "without" : "with"}-optional-${academicClass.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [...lead("Group", "Version"), "Section", "Total Student", ...stats.subjectIds.map(subjectLabel), "Total"],
      [
        ...stats.tables.flatMap((t) => {
          const group = t.groupId != null ? name("group", t.groupId) : "—"
          return [
            ...t.rows.map((r) => [
              ...lead(group, r.version),
              name("section", r.sectionId),
              r.students,
              ...stats.subjectIds.map((id) => r.subjects.get(id) ?? 0),
              r.enrolments,
            ]),
            [...lead(group, ""), "Total", t.students, ...stats.subjectIds.map((id) => t.subjects.get(id) ?? 0), t.enrolments],
          ]
        }),
        [...lead("", ""), "Grand Total", stats.students, ...stats.subjectIds.map((id) => stats.subjects.get(id) ?? 0), stats.enrolments],
      ]
    )
  }

  const sheetProps = institute &&
    academicClass &&
    stats &&
    stats.tables.length > 0 && { institute, academicClass, stats, withoutOptional, showGroup, name, subjectLabel }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Subject Statistics (Section wise)</CardTitle>
          <CardDescription>How many students of each section take each subject.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, branch: "", medium: "", class: "", year: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={branch ? String(branch.id) : ""}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year ? String(year.id) : ""}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.name} (current)` : y.name }))}
            placeholder="Select year"
            disabled={!institute}
          />
          <Field orientation="horizontal" className="self-end pb-2">
            <Checkbox
              id="subject-statistics-optional"
              checked={withoutOptional}
              onCheckedChange={(checked) => setParam({ optional: checked === true ? "without" : "" })}
            />
            <FieldLabel htmlFor="subject-statistics-optional">Without optional subject</FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Section wise Subject Statistics</CardTitle>
            <CardDescription>
              {sheetProps
                ? `${academicClass.name} · ${stats.students} student${stats.students === 1 ? "" : "s"} · ${withoutOptional ? "without" : "with"} optional. A student count opens those students.`
                : "Pick a class and year."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheetProps}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheetProps}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheetProps ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[40rem]">
                <SubjectStatisticsSheet {...sheetProps} href={href} />
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {!institute
                ? "Select an institute"
                : !academicClass || !year
                  ? "Select a class and year"
                  : "No student with subjects found in this class and year"}
            </p>
          )}
        </CardContent>
      </Card>

      {sheetProps && (
        <PrintArea pageSize="210mm 297mm">
          <SubjectStatisticsSheet {...sheetProps} />
        </PrintArea>
      )}
    </div>
  )
}
