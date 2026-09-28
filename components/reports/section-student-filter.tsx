"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { branchStore, classStore, groupStore, sectionStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"

// The section picker the RptStudent reports share (Student Information, ID
// Card): institute, branch, medium, class, year, group, version and section,
// then a roll — or student ID, when the institute hides class rolls. It
// lives in the URL.
export function useSectionStudentFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute =
    institutes.length === 1 ? institutes[0] : institutes.find((i) => String(i.id) === param("institute"))
  const iid = institute?.id ?? -1
  const branches = branchStore.useList(iid)
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)

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

  // What studentInformation() narrows by, once a class, year and section are picked.
  const selection =
    institute && academicClass && year && section
      ? {
          branchId: filter.branch ? Number(filter.branch) : null,
          medium: filter.medium,
          classId: academicClass.id,
          yearId: year.id,
          groupId: filter.group ? Number(filter.group) : null,
          version: filter.version,
          sectionId: section.id,
          rollOrId,
        }
      : null
  // Why there is nothing to show yet; null once a section is picked.
  const problem = !institute
    ? "Select an institute"
    : !academicClass || !year || !section
      ? "Select a class, year and section"
      : null

  return {
    institutes,
    institute,
    branches,
    classes,
    years,
    classGroups,
    showGroup,
    filter,
    sectionOptions,
    academicClass,
    year,
    section,
    rollOrId,
    rollLabel,
    selection,
    problem,
    param,
    setParam,
  }
}

export type SectionStudentFilter = ReturnType<typeof useSectionStudentFilter>

export function SectionStudentFilterFields({ filter: f }: { filter: SectionStudentFilter }) {
  const { institute, filter, academicClass, year, section, setParam } = f
  return (
    <>
      {f.institutes.length > 1 && (
        <FilterField
          label="Institute"
          required
          value={institute ? String(institute.id) : ""}
          onChange={(v) =>
            setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", section: "", roll: "" })
          }
          options={f.institutes.map((i) => ({ value: String(i.id), label: i.name }))}
          placeholder="Select institute"
        />
      )}
      {institute?.enableBranch && (
        <FilterField
          label="Branch"
          value={filter.branch}
          onChange={(v) => setParam({ branch: v, section: "" })}
          options={f.branches.map((b) => ({ value: String(b.id), label: b.name }))}
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
        options={f.classes.map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder="Select class"
        disabled={!institute}
      />
      <FilterField
        label="Academic year"
        required
        value={year ? String(year.id) : ""}
        onChange={(v) => setParam({ year: v })}
        options={f.years.map((y) => ({ value: String(y.id), label: y.name }))}
        placeholder="Select year"
        disabled={!institute}
      />
      {f.showGroup && (
        <FilterField
          label="Group"
          value={filter.group}
          onChange={(v) => setParam({ group: v, section: "" })}
          options={f.classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
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
        options={f.sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
        placeholder="Select section"
        disabled={!f.sectionOptions.length}
      />
      <Field>
        <FieldLabel htmlFor="roll-or-id">{f.rollLabel}</FieldLabel>
        <Input
          id="roll-or-id"
          inputMode="numeric"
          placeholder={`All students, or one ${f.rollLabel.toLowerCase()}`}
          value={f.rollOrId}
          onChange={(e) => setParam({ roll: e.target.value.trim() })}
          disabled={!institute}
        />
      </Field>
    </>
  )
}
