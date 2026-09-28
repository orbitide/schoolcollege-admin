"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { StudentInformationSheet } from "@/components/reports/student-information-sheet"
import { classRollLabel, studentIdLabel, useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { academicMediums, academicVersions } from "@/lib/institutes"
import { studentInformation } from "@/lib/student-information"
import { useStudents } from "@/lib/students"

// Legacy RptStudent/StudentInformation: pick a section (institute, branch,
// medium, class, year, group, version) and optionally a roll — or student ID
// when the institute hides class rolls — then print each student's
// information card. The filters live in the URL.
export function StudentInformationReport() {
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
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const year = years.find((y) => String(y.id) === param("year"))
  const showGroup = !!institute?.enableGroup && !!academicClass?.hasSubjectGroup
  const classGroups = showGroup ? groups.filter((g) => academicClass!.groupIds.includes(g.id)) : []
  const filter = {
    branch: institute?.enableBranch ? param("branch") : "",
    medium: institute?.enableMedium ? param("medium") : "",
    group: showGroup ? param("group") : "",
    version: institute?.enableVersion ? param("version") : "",
  }
  const sectionOptions = academicClass
    ? sections.filter(
        (s) =>
          s.classId === academicClass.id &&
          (!filter.branch || s.branchId == null || String(s.branchId) === filter.branch) &&
          (!filter.group || s.groupId == null || String(s.groupId) === filter.group) &&
          (!filter.version || !s.version || s.version === filter.version)
      )
    : []
  const section = sectionOptions.find((s) => String(s.id) === param("section"))
  const rollOrId = param("roll")
  const rollLabel = institute?.showClassRoll ? classRollLabel(institute) : studentIdLabel(institute)

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

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const rows =
    institute && academicClass && year && section
      ? studentInformation(institute, students, {
          classYearSubjects,
          subjectRank: (id) => byId.get(id)?.rank ?? Infinity,
          branchId: filter.branch ? Number(filter.branch) : null,
          medium: filter.medium,
          classId: academicClass.id,
          yearId: year.id,
          groupId: filter.group ? Number(filter.group) : null,
          version: filter.version,
          sectionId: section.id,
          rollOrId,
        })
      : undefined
  const problem = !institute
    ? "Select an institute"
    : !academicClass || !year || !section
      ? "Select a class, year and section"
      : rows && !rows.length
        ? rollOrId
          ? `No student found with ${rollLabel} ${rollOrId}`
          : "No student found"
        : null

  const sheet = institute && rows && rows.length > 0 && (
    <StudentInformationSheet
      institute={institute}
      rows={rows}
      name={name}
      subjectName={(id) => byId.get(id)?.name ?? name("subject", id)}
      subjectCode={(id) => byId.get(id)?.code.trim() || "-"}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Information</CardTitle>
          <CardDescription>
            A printable card per student of a section: class details, parents and the subjects they
            take.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", section: "", roll: "" })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={filter.branch}
              onChange={(v) => setParam({ branch: v, section: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={filter.medium}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={academicClass ? String(academicClass.id) : ""}
            onChange={(v) => setParam({ class: v, group: "", section: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select class"
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year ? String(year.id) : ""}
            onChange={(v) => setParam({ year: v })}
            options={years.map((y) => ({ value: String(y.id), label: y.name }))}
            placeholder="Select year"
            disabled={!institute}
          />
          {showGroup && (
            <FilterField
              label="Group"
              value={filter.group}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={filter.version}
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
          <Field>
            <FieldLabel htmlFor="roll-or-id">{rollLabel}</FieldLabel>
            <Input
              id="roll-or-id"
              inputMode="numeric"
              placeholder={`All students, or one ${rollLabel.toLowerCase()}`}
              value={rollOrId}
              onChange={(e) => setParam({ roll: e.target.value.trim() })}
              disabled={!institute}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Student Information</CardTitle>
            <CardDescription>
              {sheet && section && academicClass
                ? `${academicClass.name} · ${section.name} · ${rows!.length} student${rows!.length === 1 ? "" : "s"}, two to a printed page`
                : "Pick a section to see its students."}
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
              <div className="mx-auto max-w-[52rem] min-w-[40rem]">{sheet}</div>
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
