"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { branchStore, classStore, groupStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useStudents, type PublicExam } from "@/lib/students"
import { examineeYears, testimonialTypes, type TestimonialFilter } from "@/lib/testimonials"

// The examinee picker Manage Testimonial and the Testimonial report share
// (legacy LoadTestimonialType, LoadExamineeYear): institute, branch, medium,
// a class that issues testimonials, its exam type and passing year, group
// and version. It lives in the URL; a choice further up clears the ones
// that depended on it.
export function useTestimonialFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick ? institutes.find((i) => String(i.id) === param("institute")) : institutes[0]
  const iid = institute?.id ?? -1
  // Only classes that issue testimonials are offered.
  const classes = classStore.useList(iid).filter((c) => c.testimonialExams.length)
  const branches = branchStore.useList(iid)
  const groups = groupStore.useList(iid)

  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const types = testimonialTypes(selectedClass)
  // Type and examinee default to the first on offer, as soon as there is one.
  const exam = (types.find((t) => t === param("type")) ?? types[0]) as PublicExam | undefined
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []

  const toId = (value: string) => (value ? Number(value) : null)
  const base =
    institute && selectedClass && exam
      ? {
          instituteId: institute.id,
          classId: selectedClass.id,
          exam,
          branchId: toId(param("branch")),
          medium: param("medium"),
          groupId: toId(param("group")),
          version: param("version"),
        }
      : null
  const years = base ? examineeYears(students, base) : []
  const examinee = years.find((y) => y === param("examinee")) ?? years[0]
  const filter: TestimonialFilter | null = base && examinee ? { ...base, examinee } : null

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  // The print page's query for the chosen examinees, plus `extra`.
  const printQuery = (extra: Record<string, string> = {}) =>
    filter
      ? new URLSearchParams(
          Object.entries({
            institute: String(filter.instituteId),
            class: String(filter.classId),
            type: filter.exam,
            examinee: filter.examinee,
            branch: param("branch"),
            medium: param("medium"),
            group: param("group"),
            version: param("version"),
            ...extra,
          }).filter(([, value]) => value)
        ).toString()
      : ""

  return {
    students,
    institutes,
    canPick,
    institute,
    classes,
    branches,
    selectedClass,
    types,
    exam,
    classGroups,
    base,
    years,
    examinee,
    filter,
    param,
    setParam,
    printQuery,
    returnTo: `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`,
  }
}

export type TestimonialFilterState = ReturnType<typeof useTestimonialFilter>

const clearBelow = {
  institute: { branch: "", medium: "", class: "", type: "", examinee: "", group: "", version: "" },
  class: { type: "", examinee: "", group: "" },
  type: { examinee: "" },
}

export function TestimonialFilterFields({ filter: f }: { filter: TestimonialFilterState }) {
  const { institute, classes, selectedClass, types, exam, years, examinee, base, param, setParam } = f
  return (
    <>
      {f.canPick && (
        <FilterField
          label="Institute"
          required
          value={institute ? String(institute.id) : ""}
          onChange={(v) => setParam({ institute: v, ...clearBelow.institute })}
          options={f.institutes.map((i) => ({ value: String(i.id), label: i.name }))}
          placeholder="Select institute"
        />
      )}
      {institute?.enableBranch && (
        <FilterField
          label="Branch"
          value={param("branch")}
          onChange={(v) => setParam({ branch: v, examinee: "" })}
          options={f.branches.map((b) => ({ value: String(b.id), label: b.name }))}
          allLabel="All branches"
        />
      )}
      {institute?.enableMedium && (
        <FilterField
          label="Medium"
          value={param("medium")}
          onChange={(v) => setParam({ medium: v, examinee: "" })}
          options={academicMediums.map((m) => ({ value: m, label: m }))}
          allLabel="All mediums"
        />
      )}
      <FilterField
        label="Class"
        required
        value={selectedClass ? String(selectedClass.id) : ""}
        onChange={(v) => setParam({ class: v, ...clearBelow.class })}
        options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder={
          !institute ? "Pick an institute first" : classes.length ? "Select class" : "No class issues testimonials"
        }
        disabled={!institute || !classes.length}
      />
      <FilterField
        label="Type"
        required
        value={exam ?? ""}
        onChange={(v) => setParam({ type: v, ...clearBelow.type })}
        options={types.map((t) => ({ value: t, label: t }))}
        placeholder="Select type"
        disabled={!types.length}
      />
      <FilterField
        label="Examinee"
        required
        value={examinee ?? ""}
        onChange={(v) => setParam({ examinee: v })}
        options={years.map((y) => ({ value: y, label: y }))}
        placeholder={base ? (years.length ? "Select year" : "No results on record") : "Select year"}
        disabled={!years.length}
      />
      {f.classGroups.length > 0 && (
        <FilterField
          label="Group"
          value={param("group")}
          onChange={(v) => setParam({ group: v, examinee: "" })}
          options={f.classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
          allLabel="All groups"
        />
      )}
      {institute?.enableVersion && (
        <FilterField
          label="Version"
          value={param("version")}
          onChange={(v) => setParam({ version: v, examinee: "" })}
          options={academicVersions.map((v) => ({ value: v, label: v }))}
          allLabel="All versions"
        />
      )}
    </>
  )
}
