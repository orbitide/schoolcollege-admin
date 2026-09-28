"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { StudentStatisticsSheet } from "@/components/reports/student-statistics-sheet"
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
import {
  branchStore,
  classStore,
  classYearSubjectStore,
  groupStore,
  houseStore,
  sectionStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS_PER_PAGE,
  DEFAULT_TITLE,
  encodeConfig,
  type ReportFilter,
} from "@/lib/student-report"
import { studentStatistics } from "@/lib/student-statistics"
import { useStudents } from "@/lib/students"

// Legacy RptStudent/StudentStatistics: how many students — male, female and
// in all — a year has per group, section, version and house, and how many
// take each subject, narrowed by branch, medium, class, group, version and
// section. The year defaults to the current one (the legacy counts only
// that). The filters live in the URL.
export function StudentStatisticsReport() {
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
  const houses = houseStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const branch = institute?.enableBranch ? branches.find((b) => String(b.id) === param("branch")) : undefined
  const medium = institute?.enableMedium ? param("medium") : ""
  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const groupOptions = institute?.enableGroup
    ? academicClass?.hasSubjectGroup
      ? groups.filter((g) => academicClass.groupIds.includes(g.id))
      : groups
    : []
  const group = groupOptions.find((g) => String(g.id) === param("group"))
  const version = institute?.enableVersion ? param("version") : ""
  const sectionOptions = sections.filter(
    (s) =>
      (!academicClass || s.classId === academicClass.id) &&
      (!branch || s.branchId == null || s.branchId === branch.id) &&
      (!group || s.groupId == null || s.groupId === group.id) &&
      (!version || !s.version || s.version === version)
  )
  const section = sectionOptions.find((s) => String(s.id) === param("section"))

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
    institute && year
      ? studentStatistics(
          institute,
          students,
          {
            yearId: year.id,
            branchId: branch?.id ?? null,
            medium,
            classId: academicClass?.id ?? null,
            groupId: group?.id ?? null,
            version,
            sectionId: section?.id ?? null,
          },
          {
            class: rank(classes),
            section: rank(sections),
            group: rank(groups),
            house: rank(houses),
            subject: rank(subjects),
          },
          classYearSubjects
        )
      : undefined

  // A count opens its students in the Student Dynamic Report, filtered as here plus the row.
  const href = (row: Partial<ReportFilter>) => {
    if (!institute || !year) return "/students/report"
    const filter: ReportFilter = {
      instituteId: institute.id,
      branchId: branch?.id ?? null,
      medium,
      classId: academicClass?.id ?? null,
      groupId: group?.id ?? null,
      yearId: year.id,
      sectionId: section?.id ?? null,
      version,
      status: "all",
      ...row,
    }
    return `/students/report?q=${encodeConfig({
      filter,
      columns: DEFAULT_COLUMNS,
      orientation: "portrait",
      title: DEFAULT_TITLE,
      extraFields: [],
      rowsPerPage: DEFAULT_ROWS_PER_PAGE,
      signatures: ["Class Teacher", "Vice-Principal", "Principal"],
    })}`
  }

  const filterLine: [string, string][] = [
    ...(branch ? [["Branch", branch.name] as [string, string]] : []),
    ...(medium ? [["Medium", medium] as [string, string]] : []),
    ...(academicClass ? [["Class", academicClass.name] as [string, string]] : []),
    ...(year ? [["Year", year.name] as [string, string]] : []),
    ...(group ? [["Group", group.name] as [string, string]] : []),
    ...(version ? [["Version", version] as [string, string]] : []),
    ...(section ? [["Section", section.name] as [string, string]] : []),
  ]
  const byId = new Map(subjects.map((s) => [s.id, s]))
  const sheetProps = stats &&
    institute &&
    stats.total.total > 0 && {
      institute,
      stats,
      filterLine,
      classChosen: !!academicClass,
      name,
      subjectCode: (id: number) => byId.get(id)?.code.trim() || "-",
    }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Statistics</CardTitle>
          <CardDescription>
            Male, female and total students per group, section, version and house, and how many take
            each subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", section: "" })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={branch ? String(branch.id) : ""}
              onChange={(v) => setParam({ branch: v, section: "" })}
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
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v, group: "", section: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All classes"
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
          {institute?.enableGroup && (
            <FilterField
              label="Group"
              value={group ? String(group.id) : ""}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={groupOptions.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={version}
              onChange={(v) => setParam({ version: v, section: "" })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          <FilterField
            label="Section"
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={sectionOptions.map((s) => ({
              value: String(s.id),
              label: academicClass ? s.name : `${name("class", s.classId)} · ${s.name}`,
            }))}
            allLabel="All sections"
            disabled={!institute}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Student Statistics</CardTitle>
            <CardDescription>
              {sheetProps
                ? `${stats.total.total} student${stats.total.total === 1 ? "" : "s"} · ${stats.total.male} male · ${stats.total.female} female. A count opens those students.`
                : "Pick an institute and year to count its students."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheetProps}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheetProps ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[60rem] min-w-[44rem]">
                <StudentStatisticsSheet {...sheetProps} href={href} />
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {!institute ? "Select an institute" : !year ? "Select a year" : "No Data Found"}
            </p>
          )}
        </CardContent>
      </Card>

      {sheetProps && (
        <PrintArea pageSize="210mm 297mm">
          <StudentStatisticsSheet {...sheetProps} />
        </PrintArea>
      )}
    </div>
  )
}
