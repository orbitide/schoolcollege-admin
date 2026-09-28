"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { branchStore, classStore, groupStore, sectionStore, shiftStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { todayIso } from "@/lib/student-attendance"

// The day-and-students picker the attendance reports share (Daily
// Attendance Report, Attendance Summary): a date — today by default — and
// institute, branch, medium, class, year, group, version, shift and
// section, all optional but the year (the current one by default). It
// lives in the URL.
export function useAttendanceFilter() {
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
  const shifts = shiftStore.useList(iid)
  const sections = sectionStore.useList(iid)

  const date = /^\d{4}-\d{2}-\d{2}$/.test(param("date")) ? param("date") : todayIso()
  const year = years.find((y) => String(y.id) === param("year")) ?? years.find((y) => y.isCurrent)
  const branch = institute?.enableBranch ? branches.find((b) => String(b.id) === param("branch")) : undefined
  const medium = institute?.enableMedium ? param("medium") : ""
  const academicClass = classes.find((c) => String(c.id) === param("class"))
  const groupOptions =
    institute?.enableGroup && academicClass?.hasSubjectGroup
      ? groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []
  const group = groupOptions.find((g) => String(g.id) === param("group"))
  const version = institute?.enableVersion ? param("version") : ""
  const shift = institute?.enableShift ? shifts.find((s) => String(s.id) === param("shift")) : undefined
  const sectionOptions = academicClass
    ? sections.filter(
        (s) =>
          s.classId === academicClass.id &&
          (!branch || s.branchId == null || s.branchId === branch.id) &&
          (!group || s.groupId == null || s.groupId === group.id) &&
          (!version || !s.version || s.version === version) &&
          (!shift || s.shiftId == null || s.shiftId === shift.id)
      )
    : []
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

  // The day and students picked, as dailyAttendanceReport() takes them.
  const selection = year
    ? {
        date,
        yearId: year.id,
        branchId: branch?.id ?? null,
        medium,
        classId: academicClass?.id ?? null,
        groupId: group?.id ?? null,
        version,
        shiftId: shift?.id ?? null,
        sectionId: section?.id ?? null,
      }
    : null
  // What the picked students are, as the legacy report headings list them.
  const info: [string, string][] = [
    ...(institute?.enableBranch ? [["Branch", branch?.name ?? "All"] as [string, string]] : []),
    ...(institute?.enableMedium ? [["Medium", medium || "All"] as [string, string]] : []),
    ["Class", academicClass?.name ?? "All"],
    ...(groupOptions.length ? [["Group", group?.name ?? "All"] as [string, string]] : []),
    ...(institute?.enableVersion ? [["Version", version || "All"] as [string, string]] : []),
    ["Section", section?.name ?? "All"],
    ...(institute?.enableShift ? [["Shift", shift?.name ?? "All"] as [string, string]] : []),
  ]

  return {
    institutes,
    institute,
    branches,
    classes,
    years,
    shifts,
    sections,
    groupOptions,
    sectionOptions,
    date,
    year,
    branch,
    medium,
    academicClass,
    group,
    version,
    shift,
    section,
    selection,
    info,
    param,
    setParam,
  }
}

export type AttendanceFilter = ReturnType<typeof useAttendanceFilter>

export function AttendanceFilterFields({ filter: f }: { filter: AttendanceFilter }) {
  const { institute, setParam } = f
  return (
    <>
      <Field>
        <FieldLabel htmlFor="attendance-date">
          Date
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </FieldLabel>
        <Input
          id="attendance-date"
          type="date"
          value={f.date}
          onChange={(e) => setParam({ date: e.target.value === todayIso() ? "" : e.target.value })}
        />
      </Field>
      {f.institutes.length > 1 && (
        <FilterField
          label="Institute"
          required
          value={institute ? String(institute.id) : ""}
          onChange={(v) =>
            setParam({ institute: v, branch: "", medium: "", class: "", year: "", group: "", version: "", shift: "", section: "" })
          }
          options={f.institutes.map((i) => ({ value: String(i.id), label: i.name }))}
          placeholder="Select institute"
        />
      )}
      {institute?.enableBranch && (
        <FilterField
          label="Branch"
          value={f.branch ? String(f.branch.id) : ""}
          onChange={(v) => setParam({ branch: v, section: "" })}
          options={f.branches.map((b) => ({ value: String(b.id), label: b.name }))}
          allLabel="All branches"
        />
      )}
      {institute?.enableMedium && (
        <FilterField
          label="Medium"
          value={f.medium}
          onChange={(v) => setParam({ medium: v })}
          options={academicMediums.map((m) => ({ value: m, label: m }))}
          allLabel="All mediums"
        />
      )}
      <FilterField
        label="Class"
        value={f.academicClass ? String(f.academicClass.id) : ""}
        onChange={(v) => setParam({ class: v, group: "", section: "" })}
        options={f.classes.map((c) => ({ value: String(c.id), label: c.name }))}
        allLabel="All classes"
        disabled={!institute}
      />
      <FilterField
        label="Academic year"
        required
        value={f.year ? String(f.year.id) : ""}
        onChange={(v) => setParam({ year: v })}
        options={f.years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.name} (current)` : y.name }))}
        placeholder="Select year"
        disabled={!institute}
      />
      {f.groupOptions.length > 0 && (
        <FilterField
          label="Group"
          value={f.group ? String(f.group.id) : ""}
          onChange={(v) => setParam({ group: v, section: "" })}
          options={f.groupOptions.map((g) => ({ value: String(g.id), label: g.name }))}
          allLabel="All groups"
        />
      )}
      {institute?.enableVersion && (
        <FilterField
          label="Version"
          value={f.version}
          onChange={(v) => setParam({ version: v, section: "" })}
          options={academicVersions.map((v) => ({ value: v, label: v }))}
          allLabel="All versions"
        />
      )}
      {institute?.enableShift && (
        <FilterField
          label="Shift"
          value={f.shift ? String(f.shift.id) : ""}
          onChange={(v) => setParam({ shift: v, section: "" })}
          options={f.shifts.map((s) => ({ value: String(s.id), label: s.name }))}
          allLabel="All shifts"
        />
      )}
      <FilterField
        label="Section"
        value={f.section ? String(f.section.id) : ""}
        onChange={(v) => setParam({ section: v })}
        options={f.sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
        allLabel="All sections"
        disabled={!f.academicClass}
      />
    </>
  )
}
