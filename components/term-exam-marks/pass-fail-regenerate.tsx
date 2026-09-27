"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CircleCheckIcon, RefreshCwIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  branchStore,
  classStore,
  groupStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import {
  isPassRegenerated,
  regeneratePassStatus,
  useTermExamMarks,
} from "@/lib/term-exam-marks"
import { useTermExams, type TermExam } from "@/lib/term-exams"

// Legacy "Pass Fail ReGenerate" (TermExamStudentMarks/PassFailReGenerate):
// the active term exams, each with a button to recheck its students' marks
// for pass/fail, grade and GPA after marks change.
export function PassFailRegenerate() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const marks = useTermExamMarks()
  const name = useStudentLookups()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const allClasses = classStore.useAll()

  const medium = param("medium")
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const byId = new Map(institutes.map((i) => [i.id, i]))
  const is = (value: number | null, key: string) => !param(key) || String(value) === param(key)
  const rows = exams
    .filter(
      (exam) =>
        exam.status === "Active" &&
        byId.has(exam.instituteId) &&
        (!institute || exam.instituteId === institute.id) &&
        (!medium || exam.medium === medium) &&
        is(exam.classId, "class") &&
        is(exam.groupId, "group") &&
        is(exam.yearId, "year") &&
        is(exam.branchId, "branch") &&
        (!param("version") || exam.version === param("version")) &&
        is(exam.shiftId, "shift") &&
        (!needle || exam.fullName.toLowerCase().includes(needle))
    )
    .sort((a, b) => a.instituteId - b.instituteId || a.rank - b.rank)

  const markCount = new Map<number, number>()
  for (const m of marks) markCount.set(m.termExamId, (markCount.get(m.termExamId) ?? 0) + 1)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  function regenerate(exam: TermExam) {
    try {
      const count = regeneratePassStatus(exam, byId.get(exam.instituteId)!)
      toast.success(`${exam.name} result regenerated`, {
        description: `${count} marks rechecked. Generate the merit list again to update positions.`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The result could not be regenerated.")
    }
  }

  const clearStructure = { medium: "", class: "", group: "", year: "", branch: "", version: "", shift: "" }
  // Structure columns only show when a listed exam's institute uses them,
  // as the legacy grid prints "-" otherwise.
  const uses = (flag: "enableMedium" | "enableBranch" | "enableVersion" | "enableShift") =>
    rows.some((e) => byId.get(e.instituteId)?.[flag])
  const show = {
    institute: !institute,
    medium: uses("enableMedium"),
    group: rows.some((e) => allClasses.find((c) => c.id === e.classId)?.hasSubjectGroup),
    branch: uses("enableBranch"),
    version: uses("enableVersion"),
    shift: uses("enableShift"),
  }
  const columnCount = 6 + Object.values(show).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Pass Fail ReGenerate</CardTitle>
          <CardDescription>
            Rechecks every uploaded mark of an exam for pass or fail, letter grade and GPA. Run it
            after uploading or editing marks; uploading marks marks the exam as needing it again.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, ...clearStructure })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, class: "", group: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v, group: "" })}
              options={classes
                .filter((c) => !medium || !c.medium || c.medium === medium)
                .map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute && (
            <FilterField
              label="Academic year"
              value={param("year")}
              onChange={(v) => setParam({ year: v })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              allLabel="All years"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={param("version")}
              onChange={(v) => setParam({ version: v })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={param("shift")}
              onChange={(v) => setParam({ shift: v })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by exam"
                aria-label="Search by exam"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {show.institute && <TableHead>Institute</TableHead>}
              {show.medium && <TableHead>Medium</TableHead>}
              <TableHead>Class</TableHead>
              {show.group && <TableHead>Group</TableHead>}
              <TableHead>Year</TableHead>
              {show.branch && <TableHead>Branch</TableHead>}
              {show.version && <TableHead>Version</TableHead>}
              {show.shift && <TableHead>Shift</TableHead>}
              <TableHead>Exam</TableHead>
              <TableHead className="text-right">Marks</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((exam, index) => {
                const inst = byId.get(exam.instituteId)!
                const cls = allClasses.find((c) => c.id === exam.classId)
                const count = markCount.get(exam.id) ?? 0
                const done = isPassRegenerated(exam.id, marks)
                return (
                  <TableRow key={exam.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {show.institute && <TableCell>{inst.shortName || inst.name}</TableCell>}
                    {show.medium && (
                      <TableCell>{inst.enableMedium ? exam.medium || "All mediums" : "—"}</TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">{name("class", exam.classId)}</TableCell>
                    {show.group && (
                      <TableCell className="whitespace-nowrap">
                        {cls?.hasSubjectGroup
                          ? exam.groupId == null
                            ? "All groups"
                            : name("group", exam.groupId)
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell>{name("year", exam.yearId)}</TableCell>
                    {show.branch && (
                      <TableCell>
                        {inst.enableBranch
                          ? exam.branchId == null
                            ? "All branches"
                            : name("branch", exam.branchId)
                          : "—"}
                      </TableCell>
                    )}
                    {show.version && (
                      <TableCell>{inst.enableVersion ? exam.version || "All versions" : "—"}</TableCell>
                    )}
                    {show.shift && (
                      <TableCell>
                        {inst.enableShift
                          ? exam.shiftId == null
                            ? "All shifts"
                            : name("shift", exam.shiftId)
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell className="font-medium whitespace-nowrap">{exam.fullName}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{count}</TableCell>
                    <TableCell className="text-right">
                      {!exam.editEnable ? (
                        <Button size="sm" variant="secondary" disabled title="Editing is disabled for this exam">
                          <CircleCheckIcon data-icon="inline-start" />
                          Regenerated
                        </Button>
                      ) : done ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400"
                          onClick={() => regenerate(exam)}
                        >
                          <CircleCheckIcon data-icon="inline-start" />
                          Regenerated
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-amber-500 text-white hover:bg-amber-600"
                          onClick={() => regenerate(exam)}
                        >
                          <RefreshCwIcon data-icon="inline-start" />
                          Regenerate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No term exams match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
