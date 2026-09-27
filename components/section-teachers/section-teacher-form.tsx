"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MinusIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { ClassNotFound } from "@/components/section-teachers/section-teacher-detail"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicVersions, sectionGenders, type Section } from "@/lib/institutes"
import { sectionTeachers, setSectionTeachers } from "@/lib/section-teachers"
import { useTeachers } from "@/lib/teachers"

// One teacher select of a section; "" until a teacher is picked.
type TeacherPick = { key: number; teacherId: string }
let nextKey = 1
const picks = (ids: number[]): TeacherPick[] => ids.map((id) => ({ key: nextKey++, teacherId: String(id) }))

// Legacy SectionTeacher CreateEdit: for a class and academic year, each
// section with the teachers who take it — add or remove a teacher per row.
// Branch, version, shift, gender and group only narrow the sections shown;
// saving replaces the teachers of the sections shown.
export function SectionTeacherForm({ classId }: { classId?: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const allClasses = classStore.useAll()
  const teachers = useTeachers()

  const fixedClass = classId != null ? allClasses.find((c) => c.id === classId) : undefined
  const [instituteId, setInstituteId] = React.useState(
    fixedClass
      ? String(fixedClass.instituteId)
      : institutes.length === 1
        ? String(institutes[0].id)
        : (searchParams.get("institute") ?? "")
  )
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)

  const [selectedClassId, setSelectedClassId] = React.useState(fixedClass ? String(fixedClass.id) : "")
  const academicClass = classes.find((c) => String(c.id) === selectedClassId)
  const [yearId, setYearId] = React.useState(
    () => String(yearStore.getList(iid).find((y) => y.isCurrent && y.status === "Active")?.id ?? "")
  )
  const [filter, setFilter] = React.useState({ branch: "", version: "", shift: "", gender: "", group: "" })
  const [form, setForm] = React.useState<Record<number, TeacherPick[]>>({})
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})

  const is = (value: number | null, key: "branch" | "shift" | "group") =>
    !filter[key] || value == null || String(value) === filter[key]
  const shownSections = academicClass
    ? sections
        .filter(
          (s) =>
            s.classId === academicClass.id &&
            s.status === "Active" &&
            is(s.branchId, "branch") &&
            is(s.shiftId, "shift") &&
            is(s.groupId, "group") &&
            (!filter.version || !s.version || s.version === filter.version) &&
            (!filter.gender || s.gender === filter.gender)
        )
        .sort((a, b) => a.rank - b.rank)
    : []
  // Active teachers, plus an inactive one already picked so its row still
  // shows who it is (it can be removed, not newly added).
  const picked = new Set(Object.values(form).flat().map((r) => r.teacherId))
  const teacherOptions = teachers
    .filter((t) => t.instituteId === iid && (t.status === "Active" || (t.status === "Inactive" && picked.has(String(t.id)))))
    .sort((a, b) => a.rank - b.rank)
    .map((t) => ({
      value: String(t.id),
      label: `${t.name} (${t.teacherCode})${t.status === "Active" ? "" : " · Inactive"}`,
    }))
  const hasActiveTeacher = teachers.some((t) => t.instituteId === iid && t.status === "Active")
  const classGroups =
    institute?.enableGroup && academicClass?.hasSubjectGroup
      ? groups.filter((g) => academicClass.groupIds.includes(g.id))
      : []

  // Load each section's saved teachers whenever the class or year changes;
  // sections a filter hides keep what was typed for them.
  const loadedFor = React.useRef("")
  React.useEffect(() => {
    const key = `${selectedClassId}:${yearId}`
    if (loadedFor.current === key || !academicClass || !yearId) return
    loadedFor.current = key
    const classSections = sections.filter((s) => s.classId === academicClass.id && s.status === "Active")
    setForm(
      Object.fromEntries(
        classSections.map((s) => [s.id, picks(sectionTeachers(teachers, s.id, Number(yearId)).map((t) => t.id))])
      )
    )
    setErrors({})
  }, [selectedClassId, yearId, academicClass, sections, teachers])

  const rowsOf = (sectionId: number) => form[sectionId] ?? []
  const setRows = (sectionId: number, rows: TeacherPick[]) => setForm((c) => ({ ...c, [sectionId]: rows }))

  function validate() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!academicClass) next.class = "Select a class."
    if (!yearId) next.year = "Select an academic year."
    for (const s of shownSections) {
      const seen = new Set<string>()
      for (const row of rowsOf(s.id)) {
        if (!row.teacherId) continue
        if (seen.has(row.teacherId)) next[`${s.id}.${row.key}`] = "This teacher is already in the section."
        seen.add(row.teacherId)
      }
    }
    return next
  }

  function save(andNew: boolean) {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length || !institute || !academicClass) {
      toast.error("Check the highlighted fields.")
      return
    }
    if (!shownSections.length) {
      toast.error("This class has no section to assign teachers to.")
      return
    }
    // Legacy skips "Select Teacher" rows.
    const assignments = shownSections.map((section: Section) => ({
      section,
      teacherIds: [...new Set(rowsOf(section.id).filter((r) => r.teacherId).map((r) => Number(r.teacherId)))],
    }))
    setSectionTeachers(institute, academicClass, Number(yearId), assignments, user.name)
    toast.success("Teachers updated successfully")
    if (andNew) {
      setSelectedClassId("")
      setForm({})
      loadedFor.current = ""
    } else {
      router.push(`/section-teachers/${academicClass.id}`)
    }
  }

  const listHref = "/section-teachers"
  const isNew = classId == null
  if (!isNew && (!fixedClass || !institute)) return <ClassNotFound />

  return (
    <form
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{isNew ? "Add Section Teacher" : `Edit Section Teacher · ${fixedClass?.name ?? ""}`}</CardTitle>
            <CardDescription>
              Pick the academic year, then the teachers who take each section of the class.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage section teacher</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isNew && institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={instituteId}
              onChange={(v) => {
                setInstituteId(v)
                setSelectedClassId("")
                setYearId(String(yearStore.getList(Number(v)).find((y) => y.isCurrent && y.status === "Active")?.id ?? ""))
                setFilter({ branch: "", version: "", shift: "", gender: "", group: "" })
                setForm({})
                loadedFor.current = ""
              }}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
              error={errors.institute}
            />
          )}
          <FilterField
            label="Class"
            required
            value={selectedClassId}
            onChange={(v) => {
              setSelectedClassId(v)
              setFilter((c) => ({ ...c, group: "" }))
            }}
            options={classes
              .filter((c) => c.status === "Active" || c.id === fixedClass?.id)
              .map((c) => ({ value: String(c.id), label: institute?.enableMedium && c.medium ? `${c.name} (${c.medium})` : c.name }))}
            placeholder={institute ? "Select class" : "Select an institute first"}
            error={errors.class}
            disabled={!institute || !isNew}
          />
          <FilterField
            label="Academic year"
            required
            value={yearId}
            onChange={setYearId}
            options={years.filter((y) => y.status === "Active").map((y) => ({ value: String(y.id), label: y.name }))}
            placeholder={institute ? "Select year" : "Select an institute first"}
            error={errors.year}
            disabled={!institute}
          />
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={filter.branch}
              onChange={(v) => setFilter((c) => ({ ...c, branch: v }))}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Academic version"
              value={filter.version}
              onChange={(v) => setFilter((c) => ({ ...c, version: v }))}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={filter.shift}
              onChange={(v) => setFilter((c) => ({ ...c, shift: v }))}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          {institute?.enableSectionGender && (
            <FilterField
              label="Gender"
              value={filter.gender}
              onChange={(v) => setFilter((c) => ({ ...c, gender: v }))}
              options={sectionGenders.map((g) => ({ value: g, label: g }))}
              allLabel="All genders"
            />
          )}
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={filter.group}
              onChange={(v) => setFilter((c) => ({ ...c, group: v }))}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
        </CardContent>
      </Card>

      {academicClass && yearId && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Sections of {academicClass.name}</CardTitle>
            <CardDescription>
              {shownSections.length
                ? `${shownSections.length} section(s). Saving replaces the teachers of the sections shown.`
                : "No active section matches."}
              {!hasActiveTeacher && " This institute has no active teacher yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shownSections.map((section) => {
              const rows = rowsOf(section.id)
              return (
                <div key={section.id} className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Section {section.name}</h3>
                      <Badge variant="secondary">{rows.filter((r) => r.teacherId).length}</Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRows(section.id, [...rows, { key: nextKey++, teacherId: "" }])}
                      disabled={!hasActiveTeacher}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Add teacher
                    </Button>
                  </div>
                  {rows.length ? (
                    rows.map((row) => (
                      <div key={row.key} className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <FilterField
                            label="Teacher"
                            value={row.teacherId}
                            onChange={(v) =>
                              setRows(
                                section.id,
                                rows.map((r) => (r.key === row.key ? { ...r, teacherId: v } : r))
                              )
                            }
                            options={teacherOptions}
                            placeholder="Select teacher"
                            error={errors[`${section.id}.${row.key}`]}
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remove teacher"
                          className="mb-0.5 text-destructive"
                          onClick={() => setRows(section.id, rows.filter((r) => r.key !== row.key))}
                        >
                          <MinusIcon />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No teacher.</p>
                  )}
                </div>
              )
            })}
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button asChild type="button" variant="outline">
              <Link href={isNew ? listHref : `/section-teachers/${academicClass.id}`}>Back</Link>
            </Button>
            {isNew && (
              <Button type="button" variant="secondary" onClick={() => save(true)}>
                Save and new
              </Button>
            )}
            <Button type="submit">{isNew ? "Save" : "Update"}</Button>
          </CardFooter>
        </Card>
      )}
    </form>
  )
}
