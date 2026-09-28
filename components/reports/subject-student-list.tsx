"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
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
  sectionStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import { useStudents } from "@/lib/students"
import { classYearSubjectIds, rollGrid, subjectStudents } from "@/lib/subject-student-list"
import { parseInlineStyle } from "@/lib/utils"

// Legacy _subjectWiseStudentList: the institute heading, class, section,
// subject code and name, the rolls in columns of 25, an MIS Incharge
// signature line and the total.
function SubjectStudentListSheet({
  institute,
  details,
  rolls,
}: {
  institute: Institute
  details: [label: string, value: string][]
  rolls: string[]
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  return (
    <div className="flex flex-col gap-5 bg-white font-serif text-sm text-black">
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
          <h2 style={parseInlineStyle(config.reportNameStyle)}>Subject wise Student List</h2>
        </div>
        <div style={{ width: logoWidth }} className="shrink-0" />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[15px]">
        {details.map(([label, value]) => (
          <span key={label} className="flex items-center gap-2">
            {label}:
            <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
              {value}
            </strong>
          </span>
        ))}
      </div>

      <table className="w-full border-collapse text-center leading-6 tabular-nums">
        <tbody>
          {rollGrid(rolls).map((row, r) => (
            <tr key={r}>
              {row.map((roll, c) => (
                <td key={c} className="border border-black px-1">
                  {roll}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 flex items-end justify-between">
        <div className="flex flex-col items-center gap-1">
          <span className="w-40 border-t border-black" />
          MIS Incharge
        </div>
        <p className="border border-black px-5 py-1.5">
          Total Student : <strong className="text-base">{rolls.length}</strong>
        </p>
      </div>
    </div>
  )
}

// Legacy RptStudent/SubjectWiseStudentList ("Subject Student List"): pick a
// class, year and section (branch, medium, group and version where the
// institute uses them) and one of the class's subjects, and print the rolls
// of the students who take it. The filters live in the URL.
export function SubjectStudentList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()

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
  const groupOptions =
    institute?.enableGroup && academicClass?.hasSubjectGroup
      ? groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []
  const group = groupOptions.find((g) => String(g.id) === param("group"))
  const version = institute?.enableVersion ? param("version") : ""
  const sectionOptions = academicClass
    ? sections.filter(
        (s) =>
          s.classId === academicClass.id &&
          (!branch || s.branchId == null || s.branchId === branch.id) &&
          (!group || s.groupId == null || s.groupId === group.id) &&
          (!version || !s.version || s.version === version)
      )
    : []
  const section = sectionOptions.find((s) => String(s.id) === param("section"))
  const base = academicClass && year && {
    classId: academicClass.id,
    yearId: year.id,
    branchId: branch?.id ?? null,
    medium,
    groupId: group?.id ?? null,
    version,
  }
  const subjectIds = new Set(base ? classYearSubjectIds(sets, base) : [])
  const subjectOptions = subjects.filter((s) => subjectIds.has(s.id))
  const subject = subjectOptions.find((s) => String(s.id) === param("subject"))

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

  const rows =
    institute && base && section && subject
      ? subjectStudents(institute, students, sets, { ...base, sectionId: section.id }, subject.id)
      : undefined
  const problem = !institute
    ? "Select an institute"
    : !academicClass || !year || !section
      ? "Select a class, year and section"
      : !subject
        ? subjectOptions.length
          ? "Select a subject"
          : "This class has no subjects for the year. Set them in Class Subjects."
        : "No Student Found"

  const sheet = institute && academicClass && section && subject && rows && rows.length > 0 && (
    <SubjectStudentListSheet
      institute={institute}
      details={[
        ["Class", academicClass.name],
        ["Section", section.name],
        ["Subject Code", subject.code.trim() || "-"],
        ["Name of the Subject", subject.name],
      ]}
      rolls={rows.map((r) => r.enrolment.classRoll)}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Subject Student List</CardTitle>
          <CardDescription>The rolls of a section&apos;s students who take a subject.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", section: "", subject: "" })
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
              onChange={(v) => setParam({ medium: v, subject: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v, group: "", section: "", subject: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year ? String(year.id) : ""}
            onChange={(v) => setParam({ year: v, subject: "" })}
            options={years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.name} (current)` : y.name }))}
            placeholder="Select year"
            disabled={!institute}
          />
          {groupOptions.length > 0 && (
            <FilterField
              label="Group"
              value={group ? String(group.id) : ""}
              onChange={(v) => setParam({ group: v, section: "", subject: "" })}
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
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => setParam({ section: v })}
            options={sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select section"
            disabled={!sectionOptions.length}
          />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.id) : ""}
            onChange={(v) => setParam({ subject: v })}
            options={subjectOptions.map((s) => ({ value: String(s.id), label: s.code.trim() ? `${s.name} (${s.code.trim()})` : s.name }))}
            placeholder="Select subject"
            disabled={!subjectOptions.length}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Subject wise Student List</CardTitle>
            <CardDescription>
              {sheet
                ? `${academicClass.name} · ${section.name} · ${subject.name} · ${rows.length} student${rows.length === 1 ? "" : "s"}`
                : "Pick a section and a subject."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[52rem] min-w-[36rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
