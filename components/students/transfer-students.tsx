"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon, ArrowRightLeftIcon, ListChecksIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  sectionStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import {
  fitsPlace,
  transferStudents,
  useStudents,
  type EnrolmentPlace,
} from "@/lib/students"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value; "" here means "All" / "Keep".
const ANY = "__any"

type Side = {
  medium: string
  class: string
  group: string
  version: string
  year: string
  section: string
}

const emptySide: Side = { medium: "", class: "", group: "", version: "", year: "", section: "" }

// Legacy "Student Transfer" (Views/Student/TransferStudent.cshtml): list the
// students of one section (From), tick who moves on, and give them a new
// enrolment in another class, year and section (To) — typically promotion
// at the start of a new academic year.
export function TransferStudents() {
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1
  const allStudents = useStudents()

  const [instituteId, setInstituteId] = React.useState(
    canPick ? "" : String(institutes[0]?.id ?? "")
  )
  const [branch, setBranch] = React.useState("")
  const [from, setFrom] = React.useState<Side>(emptySide)
  const [to, setTo] = React.useState<Side>(emptySide)
  const [withSubjects, setWithSubjects] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  // The From/To choice the list was built for; any change hides the list.
  const [shown, setShown] = React.useState<{ from: EnrolmentPlace; to: EnrolmentPlace } | null>(
    null
  )
  const [picked, setPicked] = React.useState<Record<number, boolean>>({})
  const [groupFor, setGroupFor] = React.useState<Record<number, string>>({})
  const [confirming, setConfirming] = React.useState(false)

  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const years = yearStore.useList(iid)
  const classes = classStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const groups = groupStore.useList(iid)
  const branches = branchStore.useList(iid)

  const classOf = (id: string) => classes.find((c) => String(c.id) === id)
  const groupsOf = (id: string) => {
    const c = classOf(id)
    return institute?.enableGroup && c?.hasSubjectGroup
      ? groups.filter((g) => c.groupIds.includes(g.id))
      : []
  }
  const sectionsFor = (side: Side) =>
    sections.filter(
      (s) =>
        String(s.classId) === side.class &&
        (!branch || String(s.branchId) === branch) &&
        (!side.version || s.version === side.version) &&
        (!side.group || s.groupId == null || String(s.groupId) === side.group)
    )

  function reset() {
    setShown(null)
    setPicked({})
    setGroupFor({})
  }

  function update(which: "from" | "to", key: keyof Side, value: string) {
    const apply = which === "from" ? setFrom : setTo
    apply((current) => ({
      ...current,
      [key]: value,
      // The section (and group) belong to the class they were picked for.
      ...(key === "class" && { section: "", group: "" }),
      ...((key === "group" || key === "version") && { section: "" }),
    }))
    setErrors((current) => ({ ...current, [`${which}.${key}`]: undefined }))
    reset()
  }

  const toId = (value: string) => (value ? Number(value) : null)

  function show() {
    const e: Record<string, string> = {}
    const need = (key: string, value: string, label: string, when = true) => {
      if (when && !value) e[key] = `${label} is required.`
    }
    need("institute", instituteId, "Institute")
    need("branch", branch, "Branch", Boolean(institute?.enableBranch))
    for (const [which, side] of [
      ["from", from],
      ["to", to],
    ] as const) {
      need(`${which}.medium`, side.medium, "Medium", Boolean(institute?.enableMedium))
      need(`${which}.class`, side.class, "Class")
      need(`${which}.year`, side.year, "Academic year")
      need(`${which}.section`, side.section, "Section")
    }
    if (!e["to.section"] && from.section && from.section === to.section && from.year === to.year) {
      e["to.section"] = "Pick a different class, year or section to transfer to."
    }
    setErrors(e)
    if (Object.keys(e).length) {
      toast.error("Please select the required data.")
      return
    }
    const toSection = sections.find((s) => String(s.id) === to.section)
    setShown({
      from: {
        yearId: Number(from.year),
        classId: Number(from.class),
        sectionId: Number(from.section),
        medium: from.medium,
        branchId: toId(branch),
        version: from.version,
        groupId: toId(from.group),
      },
      to: {
        yearId: Number(to.year),
        classId: Number(to.class),
        sectionId: Number(to.section),
        medium: to.medium,
        branchId: toSection?.branchId ?? toId(branch),
        shiftId: toSection?.shiftId ?? null,
        version: toSection?.version || to.version,
        groupId: toSection?.groupId ?? toId(to.group),
      },
    })
    setPicked({})
    setGroupFor({})
  }

  // Students of the From section, in roll order.
  const rows = shown
    ? allStudents
        .flatMap((student) => {
          if (student.instituteId !== iid) return []
          const enrolment = student.enrolments.find((e) => fitsPlace(e, shown.from))
          return enrolment ? [{ student, enrolment }] : []
        })
        .sort((a, b) =>
          a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
        )
    : []
  const toHasGroups = groupsOf(to.class).length > 0
  const alreadyIn = (studentId: number) =>
    Boolean(
      shown &&
        allStudents
          .find((s) => s.id === studentId)
          ?.enrolments.some((e) => e.yearId === shown.to.yearId)
    )
  const selectable = rows.filter(({ student }) => !alreadyIn(student.id))
  const chosen = selectable.filter(({ student }) => picked[student.id])
  // Who still needs a group in the new class (legacy: when moving into a
  // grouped class from one without groups).
  const needsGroup = ({ enrolment }: Row) =>
    toHasGroups && shown?.to.groupId == null && enrolment.groupId == null
  const missingGroup = chosen.filter((row) => needsGroup(row) && !groupFor[row.student.id])

  function transfer() {
    if (!shown || !institute) return
    const result = transferStudents({
      instituteId: institute.id,
      from: shown.from,
      to: { ...(shown.to as Required<EnrolmentPlace>), hasGroups: toHasGroups },
      withSubjects,
      byRoll: institute.showClassRoll,
      students: chosen.map(({ student }) => ({
        id: student.id,
        groupId: toId(groupFor[student.id] ?? ""),
      })),
    })
    setConfirming(false)
    setPicked({})
    const skipped = [
      result.notFound.length && `${result.notFound.length} student not found`,
      result.alreadyExist.length &&
        `${result.alreadyExist.length} student already exist in transfer class`,
      result.rollTaken.length &&
        `${result.rollTaken.length} student's ${classRollLabel(institute).toLowerCase()} is already used there (${result.rollTaken.join(", ")})`,
    ].filter(Boolean)
    if (!skipped.length) toast.success(`${result.transferred} student${result.transferred === 1 ? "" : "s"} transferred`)
    else if (result.transferred) toast.warning(`Data saved with error, ${skipped.join(" and ")}.`)
    else toast.error(`Nothing transferred: ${skipped.join(" and ")}.`)
  }

  const nameOf = (list: { id: number; name: string }[], id?: number | null) =>
    list.find((item) => item.id === id)?.name ?? "—"
  const target = shown
    ? `${nameOf(classes, shown.to.classId)} ${nameOf(years, shown.to.yearId)}, Section ${nameOf(sections, shown.to.sectionId)}`
    : ""

  const sidePanel = (which: "from" | "to", side: Side) => {
    const sideGroups = groupsOf(side.class)
    const err = (key: string) => errors[`${which}.${key}`]
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
        <p className="font-semibold">{which === "from" ? "From" : "To"}</p>
        {institute?.enableMedium && (
          <Pick
            label="Medium"
            required
            value={side.medium}
            onChange={(v) => update(which, "medium", v)}
            options={academicMediums.map((m) => ({ value: m, label: m }))}
            error={err("medium")}
          />
        )}
        <Pick
          label="Class"
          required
          value={side.class}
          onChange={(v) => update(which, "class", v)}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Select class"
          error={err("class")}
          disabled={!institute}
        />
        <Pick
          label="Year"
          required
          value={side.year}
          onChange={(v) => update(which, "year", v)}
          options={years.map((y) => ({
            value: String(y.id),
            label: y.isCurrent ? `${y.name} (current)` : y.name,
          }))}
          placeholder="Select year"
          error={err("year")}
          disabled={!institute}
        />
        {sideGroups.length > 0 && (
          <Pick
            label="Group"
            value={side.group}
            onChange={(v) => update(which, "group", v)}
            options={sideGroups.map((g) => ({ value: String(g.id), label: g.name }))}
            anyLabel={which === "from" ? "All groups" : "Keep each student's group"}
          />
        )}
        {institute?.enableVersion && (
          <Pick
            label="Version"
            value={side.version}
            onChange={(v) => update(which, "version", v)}
            options={academicVersions.map((v) => ({ value: v, label: v }))}
            anyLabel={which === "from" ? "All versions" : "Keep each student's version"}
          />
        )}
        <Pick
          label="Section"
          required
          value={side.section}
          onChange={(v) => update(which, "section", v)}
          options={sectionsFor(side).map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder={side.class ? "Select section" : "Pick a class first"}
          error={err("section")}
          disabled={!side.class}
        />
        {which === "from" && (
          <Field orientation="horizontal" className="pt-1">
            <Checkbox
              id="withSubjects"
              checked={withSubjects}
              onCheckedChange={(checked) => setWithSubjects(checked === true)}
            />
            <FieldLabel htmlFor="withSubjects" className="font-normal">
              With subjects (copy each student&apos;s subjects to the new class)
            </FieldLabel>
          </Field>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Transfer</CardTitle>
          <CardDescription>
            Move the students of a section to their next class, year and section, e.g. when
            promoting at the start of a new academic year.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {(canPick || institute?.enableBranch) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:w-2/3">
              {canPick && (
                <Pick
                  label="Institute"
                  required
                  value={instituteId}
                  onChange={(v) => {
                    setInstituteId(v)
                    setBranch("")
                    setFrom(emptySide)
                    setTo(emptySide)
                    setErrors({})
                    reset()
                  }}
                  options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                  placeholder="Select institute"
                  error={errors.institute}
                />
              )}
              {institute?.enableBranch && (
                <Pick
                  label="Branch"
                  required
                  value={branch}
                  onChange={(v) => {
                    setBranch(v)
                    setFrom((c) => ({ ...c, section: "" }))
                    setTo((c) => ({ ...c, section: "" }))
                    setErrors((c) => ({ ...c, branch: undefined }))
                    reset()
                  }}
                  options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                  placeholder="Select branch"
                  error={errors.branch}
                />
              )}
            </div>
          )}

          <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {sidePanel("from", from)}
            <ArrowRightIcon className="mx-auto size-6 rotate-90 text-muted-foreground lg:rotate-0" />
            {sidePanel("to", to)}
          </div>

          <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
            <Button asChild variant="outline">
              <Link href="/students">
                <ArrowLeftIcon data-icon="inline-start" />
                Back
              </Link>
            </Button>
            <Button type="button" onClick={show} disabled={!institute}>
              <ListChecksIcon data-icon="inline-start" />
              Show students
            </Button>
          </div>
        </CardContent>
      </Card>

      {shown && institute && (
        <StudentPicker
          institute={institute}
          rows={rows}
          selectableCount={selectable.length}
          chosenCount={chosen.length}
          picked={picked}
          setPicked={setPicked}
          alreadyIn={alreadyIn}
          toYear={nameOf(years, shown.to.yearId)}
          needsGroup={needsGroup}
          groups={groupsOf(to.class)}
          groupFor={groupFor}
          setGroupFor={setGroupFor}
          groupName={(id) => nameOf(groups, id)}
          onTransfer={() => {
            if (missingGroup.length) {
              toast.error(
                `Select the academic group for ${missingGroup.map(({ student }) => student.name).join(", ")}.`
              )
              return
            }
            setConfirming(true)
          }}
        />
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Transfer {chosen.length} student{chosen.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They get a new enrolment in {target}
              {withSubjects ? " with their current subjects" : ""}, keeping their roll, house
              and type. Their current enrolment is kept as history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={transfer}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type Row = {
  student: { id: number; name: string; studentIdentificationNo: number }
  enrolment: { classRoll: string; groupId: number | null }
}

function StudentPicker({
  institute,
  rows,
  selectableCount,
  chosenCount,
  picked,
  setPicked,
  alreadyIn,
  toYear,
  needsGroup,
  groups,
  groupFor,
  setGroupFor,
  groupName,
  onTransfer,
}: {
  institute: Institute
  rows: Row[]
  selectableCount: number
  chosenCount: number
  picked: Record<number, boolean>
  setPicked: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  alreadyIn: (studentId: number) => boolean
  toYear: string
  needsGroup: (row: Row) => boolean
  groups: { id: number; name: string }[]
  groupFor: Record<number, string>
  setGroupFor: React.Dispatch<React.SetStateAction<Record<number, string>>>
  groupName: (id: number | null) => string
  onTransfer: () => void
}) {
  const showRoll = institute.showClassRoll
  const showGroup = groups.length > 0
  const allPicked = selectableCount > 0 && chosenCount === selectableCount

  function pickAll(checked: boolean) {
    setPicked(
      checked
        ? Object.fromEntries(
            rows.filter(({ student }) => !alreadyIn(student.id)).map(({ student }) => [student.id, true])
          )
        : {}
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>
          {rows.length
            ? `${rows.length} in the section; ${chosenCount} selected.`
            : "No students are enrolled in this section and year."}
        </CardDescription>
      </CardHeader>
      {rows.length > 0 && (
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allPicked ? true : chosenCount > 0 ? "indeterminate" : false}
                      onCheckedChange={(checked) => pickAll(checked === true)}
                      aria-label="Select all students"
                      disabled={!selectableCount}
                    />
                  </TableHead>
                  <TableHead>
                    {showRoll ? classRollLabel(institute) : studentIdLabel(institute)}
                  </TableHead>
                  <TableHead>Student name</TableHead>
                  {showGroup && <TableHead>Academic group</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const { student, enrolment } = row
                  const done = alreadyIn(student.id)
                  return (
                    <TableRow
                      key={student.id}
                      className={cn(done && "text-muted-foreground")}
                      data-state={picked[student.id] ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={Boolean(picked[student.id]) && !done}
                          disabled={done}
                          onCheckedChange={(checked) =>
                            setPicked((current) => ({ ...current, [student.id]: checked === true }))
                          }
                          aria-label={`Select ${student.name}`}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {showRoll ? enrolment.classRoll || "—" : student.studentIdentificationNo}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/students/${student.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {student.name}
                        </Link>
                      </TableCell>
                      {showGroup && (
                        <TableCell className="min-w-44">
                          {needsGroup(row) && !done ? (
                            <Select
                              value={groupFor[student.id] ?? ""}
                              onValueChange={(value) =>
                                setGroupFor((current) => ({ ...current, [student.id]: value }))
                              }
                            >
                              <SelectTrigger size="sm" className="w-full" aria-label={`Group for ${student.name}`}>
                                <SelectValue placeholder="Select academic group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {groups.map((g) => (
                                    <SelectItem key={g.id} value={String(g.id)}>
                                      {g.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            groupName(enrolment.groupId)
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {done ? (
                          <Badge variant="secondary">Already in {toYear}</Badge>
                        ) : (
                          <Badge variant="outline">Ready</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-center">
            <Button type="button" onClick={onTransfer} disabled={!chosenCount}>
              <ArrowRightLeftIcon data-icon="inline-start" />
              Transfer {chosenCount || ""} student{chosenCount === 1 ? "" : "s"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function Pick({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  anyLabel,
  error,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  // Offers a blank choice with this label.
  anyLabel?: string
  error?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select
        value={value === "" && anyLabel ? ANY : value}
        onValueChange={(next) => onChange(next === ANY ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {anyLabel && <SelectItem value={ANY}>{anyLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
