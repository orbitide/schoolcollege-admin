"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ListIcon, SchoolIcon, UserIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
import { IMAGE_TYPES } from "@/components/institutes/institute-form"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  branchStore,
  categoryStore,
  classStore,
  classYearSubjectStore,
  groupStore,
  houseStore,
  sectionStore,
  sessionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useDistricts } from "@/lib/districts"
import {
  academicMediums,
  academicVersions,
  recordStatuses,
  type Institute,
  type RecordStatus,
} from "@/lib/institutes"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { useInstitute } from "@/lib/institutes-store"
import {
  addStudent,
  bloodGroups,
  communicationPersons,
  currentEnrolment,
  genders,
  isRollTaken,
  isStudentIdTaken,
  nextStudentId,
  religions,
  studentTypes,
  updateStudent,
  useStudent,
  type BoardResult,
  type CommunicationPerson,
  type Enrolment,
  type PublicExam,
  type Student,
  type StudentInput,
} from "@/lib/students"
import {
  boardResultSchema,
  issuesToErrors,
  studentFormSchema,
  type StudentFormValues,
} from "@/lib/schemas/student"
import { cn } from "@/lib/utils"

// Radix Select can't use "" as a value, so optional selects map "" to this.
const NONE = "__none"

// Board information, in the legacy form's order. HSC and A Level have no
// EIIN in the legacy Student entity.
const boardExams: PublicExam[] = ["JSC", "SSC", "HSC", "A Level", "O Level"]
const noEiin: PublicExam[] = ["HSC", "A Level"]
const boardFields: { key: keyof BoardResult; label: string }[] = [
  { key: "passingYear", label: "Passing year" },
  { key: "board", label: "Board" },
  { key: "roll", label: "Roll" },
  { key: "registrationNo", label: "Registration no." },
  { key: "gpa", label: "GPA" },
  { key: "totalMarks", label: "Total marks" },
  { key: "eiin", label: "EIIN" },
]

const emptyBoard: BoardResult = {
  passingYear: "",
  board: "",
  roll: "",
  registrationNo: "",
  gpa: "",
  totalMarks: "",
  eiin: "",
}

const hasBoardData = (result?: BoardResult) =>
  Boolean(result && Object.values(result).some((value) => value.trim()))

// Where Back, Cancel and Save lead: the list the form was opened from.
function useReturnHref(fallback: string) {
  const returnTo = useSearchParams().get("returnTo")
  return returnTo?.startsWith("/students") ? returnTo : fallback
}

// Legacy Student Create/Edit (Views/Student/CreateEdit.cshtml): basic,
// academic, subjects, personal and board information. Editing changes the
// chosen year's enrolment and keeps the others as history. Transfer (legacy
// "Add Previous Student") keeps the student's details but starts a new
// enrolment in another year.
export function StudentForm({
  studentId,
  transfer = false,
}: {
  // Absent when adding a new student.
  studentId?: number
  transfer?: boolean
}) {
  const searchParams = useSearchParams()
  const student = useStudent(studentId ?? -1)
  const institute = useInstitute(student?.instituteId ?? -1)
  // The enrolment a transfer starts from (?fromYear=), else the current one.
  const fromYear = Number(searchParams.get("fromYear"))
  const listHref = useReturnHref(
    institute ? `/students?institute=${institute.id}` : "/students"
  )

  if (studentId === undefined) return <NewStudentForm />
  if (!student || !institute) {
    return <Missing href={listHref} />
  }

  return (
    <StudentFormBody
      key={`${student.id}-${transfer}`}
      institute={institute}
      student={student}
      transferFrom={
        transfer
          ? (student.enrolments.find((e) => e.yearId === fromYear) ??
            currentEnrolment(student))
          : undefined
      }
      listHref={listHref}
    />
  )
}

// A new student joins one institute. As in the legacy form, only a user who
// can work with several institutes (a super admin) picks it: from the panel
// header, kept in the URL (?institute=) so a refresh keeps it. An institute
// admin with a single institute goes straight to the form.
function NewStudentForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1
  const institute = canPick
    ? institutes.find((i) => String(i.id) === searchParams.get("institute"))
    : institutes[0]
  const listHref = useReturnHref(
    institute && canPick ? `/students?institute=${institute.id}` : "/students"
  )
  // Bumped by "Save and new" to start an empty form for the next student.
  const [resetKey, setResetKey] = React.useState(0)

  function pickInstitute(value: string) {
    const params = new URLSearchParams(searchParams)
    params.set("institute", value)
    router.replace(`${pathname}?${params}`)
  }

  const picker = canPick && (
    <Select value={institute ? String(institute.id) : ""} onValueChange={pickInstitute}>
      <SelectTrigger size="sm" aria-label="Institute" className="w-full sm:w-64">
        <SelectValue placeholder="Select institute" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {institutes.map((i) => (
            <SelectItem key={i.id} value={String(i.id)}>
              {i.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  return (
    <FormPanel
      title="Add Student"
      subtitle={canPick && institute ? `${institute.name} · changing the institute clears the form` : undefined}
      listHref={listHref}
      actions={picker}
    >
      {institute ? (
        // Keyed by institute so its numbering, classes and sections start fresh.
        <StudentFormBody
          key={`${institute.id}-${resetKey}`}
          institute={institute}
          listHref={listHref}
          embedded
          onSaveAndNew={() => {
            setResetKey((key) => key + 1)
            window.scrollTo({ top: 0 })
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <SchoolIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">
            {institutes.length
              ? "Choose the institute the student is joining"
              : "You don't have access to any institute"}
          </p>
          <p className="text-sm text-muted-foreground">
            {institutes.length
              ? "Use the Institute selector at the top right; the form then loads for it."
              : "Ask a super admin to assign you an institute under User Institutes."}
          </p>
        </div>
      )}
    </FormPanel>
  )
}

// The legacy page frame: one panel titled "Add Student" with a
// "Manage Student" button back to the list. `actions` holds page-wide
// controls such as the super admin's institute selector.
export function FormPanel({
  title,
  subtitle,
  listHref,
  listLabel = "Manage Students",
  actions,
  children,
}: {
  title: string
  subtitle?: string
  listHref: string
  listLabel?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-4 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {actions}
            <Button asChild variant="outline" size="sm">
              <Link href={listHref}>
                <ListIcon data-icon="inline-start" />
                {listLabel}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

function Missing({ href }: { href: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-xl font-semibold">Student not found</h2>
      <p className="text-sm text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>Back to students</Link>
      </Button>
    </div>
  )
}

// Form inputs, typed by the Zod schema: strings as the inputs produce them,
// with ids as strings ("" = none).
type Values = StudentFormValues

const id = (value: number | null | undefined) => (value == null ? "" : String(value))
const toId = (value: string) => (value ? Number(value) : null)

function StudentFormBody({
  institute,
  student,
  transferFrom,
  listHref,
  embedded = false,
  onSaveAndNew,
}: {
  institute: Institute
  student?: Student
  // Set when transferring: the enrolment the student is moving on from.
  transferFrom?: Enrolment
  listHref: string
  // Rendered inside the new-student page, which supplies the panel.
  embedded?: boolean
  // Offered for new students: after saving, start an empty form instead of
  // leaving (legacy "Save And New").
  onSaveAndNew?: () => void
}) {
  const transfer = Boolean(transferFrom)
  const router = useRouter()
  // The institute name only matters to users who work with several.
  const manyInstitutes = useAccessibleInstitutes().length > 1
  const years = yearStore.useList(institute.id)
  const classes = classStore.useList(institute.id)
  const sections = sectionStore.useList(institute.id)
  const groups = groupStore.useList(institute.id)
  const sessions = sessionStore.useList(institute.id)
  const houses = houseStore.useList(institute.id)
  const categories = categoryStore.useList(institute.id)
  const subjects = subjectStore.useList(institute.id)
  const subjectSets = classYearSubjectStore.useList(institute.id)
  const branches = branchStore.useList(institute.id)
  const shifts = shiftStore.useList(institute.id)
  const districts = useDistricts()

  const autoId = institute.enableAutoIncrementStudentId
  const showRoll = institute.showClassRoll
  const enrolment = transferFrom ?? (student ? currentEnrolment(student) : undefined)
  const currentYear = years.find((year) => year.isCurrent)
  // The year a transfer defaults to: the first year after the one the student
  // is leaving that they aren't enrolled in yet, else the current year.
  const fromRank = years.find((y) => y.id === transferFrom?.yearId)?.rank ?? 0
  const transferYear =
    years.find(
      (y) => y.rank > fromRank && !student?.enrolments.some((e) => e.yearId === y.id)
    )?.id ?? currentYear?.id

  const [v, setValues] = React.useState<Values>(() => ({
    studentIdentificationNo: student
      ? String(student.studentIdentificationNo)
      : autoId
        ? String(nextStudentId(institute))
        : "",
    name: student?.name ?? "",
    gender: student?.gender ?? "Male",
    dateOfBirth: student?.dateOfBirth ?? "",
    bloodGroup: student?.bloodGroup ?? "",
    religion: student?.religion ?? "",
    primaryMobile: student?.primaryMobile ?? "",
    districtId: id(student?.districtId),
    categoryId: id(student?.categoryId),
    imageUrl: student?.imageUrl ?? "",
    email: student?.email ?? "",
    presentAddress: student?.presentAddress ?? "",
    isSameAs: student?.isSameAs ?? true,
    permanentAddress: student?.permanentAddress ?? "",
    medicalHistory: student?.medicalHistory ?? "",
    hobby: student?.hobby ?? "",
    fatherName: student?.fatherName ?? "",
    fatherMobile: student?.fatherMobile ?? "",
    fatherEmail: student?.fatherEmail ?? "",
    fatherProfession: student?.fatherProfession ?? "",
    motherName: student?.motherName ?? "",
    motherMobile: student?.motherMobile ?? "",
    motherEmail: student?.motherEmail ?? "",
    motherProfession: student?.motherProfession ?? "",
    guardianName: student?.guardianName ?? "",
    guardianMobile: student?.guardianMobile ?? "",
    guardianRelation: student?.guardianRelation ?? "",
    guardianAddress: student?.guardianAddress ?? "",
    primaryCommunicationPerson: student?.primaryCommunicationPerson ?? "Father",
    status: student?.status ?? "Active",
    // A transfer starts a blank enrolment (legacy `new StudentClass()`),
    // keeping only what isn't tied to the class: medium, house, type, bank ID.
    yearId: id(transfer ? transferYear : (enrolment?.yearId ?? currentYear?.id)),
    medium: enrolment?.medium || (institute.enableMedium ? academicMediums[0] : ""),
    classId: transfer ? "" : id(enrolment?.classId),
    branchId: transfer ? "" : id(enrolment?.branchId),
    shiftId: transfer ? "" : id(enrolment?.shiftId),
    version: transfer ? "" : (enrolment?.version ?? ""),
    groupId: transfer ? "" : id(enrolment?.groupId),
    sectionId: transfer ? "" : id(enrolment?.sectionId),
    sessionId: transfer ? "" : id(enrolment?.sessionId),
    houseId: id(enrolment?.houseId),
    classRoll: transfer ? "" : (enrolment?.classRoll ?? ""),
    studentType: enrolment?.studentType ?? "Regular",
    bankId: enrolment?.bankId ?? "",
  }))
  const [board, setBoard] = React.useState<Partial<Record<PublicExam, BoardResult>>>(
    student?.board ?? {}
  )
  // Non-compulsory subjects the student picked; compulsory ones are implied.
  const [picked, setPicked] = React.useState<number[]>(
    transfer ? [] : (enrolment?.subjectIds ?? [])
  )
  // The student's one optional (4th) subject, among the picked ones.
  const [optionalSubjectId, setOptionalSubjectId] = React.useState<number | null>(
    transfer ? null : (enrolment?.optionalSubjectId ?? null)
  )
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // ---- Derived academic structure (legacy LoadSection & co.) ----
  const selectedClass = classes.find((c) => String(c.id) === v.classId)
  const classGroups =
    institute.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const needsSession = Boolean(selectedClass?.hasSession)
  const classSections = sections.filter((s) => String(s.classId) === v.classId)
  // Sections that fit the branch, shift, version and group picked so far.
  const fits = (s: (typeof sections)[number], values: Values) =>
    (!values.branchId || String(s.branchId) === values.branchId) &&
    (!values.shiftId || String(s.shiftId) === values.shiftId) &&
    (!values.version || s.version === values.version) &&
    (!values.groupId || s.groupId == null || String(s.groupId) === values.groupId)
  const sectionOptions = classSections.filter((s) => fits(s, v))
  const section = classSections.find((s) => String(s.id) === v.sectionId)

  // Changing a filter drops a section that no longer fits it.
  function setFilter(key: "branchId" | "shiftId" | "version" | "groupId", value: string) {
    setValues((current) => {
      const next = { ...current, [key]: value }
      const chosen = classSections.find((s) => String(s.id) === next.sectionId)
      return chosen && !fits(chosen, next) ? { ...next, sectionId: "" } : next
    })
  }

  // Picking a section fills in the branch, shift, version and group it sets.
  function pickSection(value: string) {
    const chosen = classSections.find((s) => String(s.id) === value)
    setValues((current) => ({
      ...current,
      sectionId: value,
      ...(chosen?.branchId != null && { branchId: String(chosen.branchId) }),
      ...(chosen?.shiftId != null && { shiftId: String(chosen.shiftId) }),
      ...(chosen?.version && { version: chosen.version }),
      ...(chosen?.groupId != null && { groupId: String(chosen.groupId) }),
    }))
  }

  const subjectSet = subjectSets.find(
    (set) =>
      String(set.classId) === v.classId &&
      String(set.yearId) === v.yearId &&
      set.medium === (institute.enableMedium ? v.medium : "")
  )
  const offered = (subjectSet?.details ?? []).filter(
    (detail) => detail.groupId == null || id(detail.groupId) === v.groupId
  )
  const compulsoryIds = offered
    .filter((detail) => detail.subjectType === "Compulsory")
    .map((detail) => detail.subjectId)
  const chosenIds = offered
    .map((detail) => detail.subjectId)
    .filter((subjectId) => compulsoryIds.includes(subjectId) || picked.includes(subjectId))
  const optionalId =
    optionalSubjectId != null &&
    chosenIds.includes(optionalSubjectId) &&
    !compulsoryIds.includes(optionalSubjectId)
      ? optionalSubjectId
      : null

  function toggleSubject(subjectId: number, checked: boolean) {
    setPicked((current) =>
      checked ? [...current, subjectId] : current.filter((s) => s !== subjectId)
    )
    if (!checked && optionalSubjectId === subjectId) setOptionalSubjectId(null)
  }

  // Only one optional subject: ticking one moves the mark (and takes the
  // subject); unticking clears it.
  function toggleOptional(subjectId: number, checked: boolean) {
    if (checked) {
      setPicked((current) => (current.includes(subjectId) ? current : [...current, subjectId]))
      setOptionalSubjectId(subjectId)
    } else {
      setOptionalSubjectId(null)
    }
  }

  // Board information shows only the exams this class sits (legacy
  // ClassHasBoard), plus any exam the student already has results for.
  const shownExams = boardExams.filter(
    (exam) => selectedClass?.publicExams.includes(exam) || hasBoardData(board[exam])
  )

  const nameOf = (list: { id: number; name: string }[], value: number | null | undefined) =>
    list.find((item) => item.id === value)?.name ?? "—"
  const active = <T extends { id: number; status: string }>(list: T[], current: string) =>
    list.filter((item) => item.status === "Active" || String(item.id) === current)

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        imageUrl: "Only .jpg, .jpeg and .png images are accepted.",
      }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      set("imageUrl", String(reader.result))
      setErrors((current) => ({ ...current, imageUrl: undefined }))
    }
    reader.readAsDataURL(file)
  }

  // Every rule lives in the Zod schema (lib/schemas/student.ts); the form
  // supplies what depends on the institute, the class and the stores.
  function validate() {
    const schema = studentFormSchema({
      studentIdLabel: studentIdLabel(institute),
      classRollLabel: classRollLabel(institute),
      categoryLabel: institute.studentCategoryLabel.trim() || "Student category",
      houseLabel: institute.studentHouseLabel.trim() || "Student house",
      requires: {
        branch: institute.enableBranch,
        medium: institute.enableMedium,
        version: institute.enableVersion,
        shift: institute.enableShift,
        group: classGroups.length > 0,
        section: Boolean(v.classId),
        session: needsSession,
        category: institute.enableStudentCategory,
        house: institute.enableStudentHouse,
        classRoll: showRoll,
      },
      isStudentIdTaken: (sid) => isStudentIdTaken(institute.id, sid, student?.id),
      isRollTaken: (values) =>
        isRollTaken(
          institute.id,
          Number(values.classId),
          Number(values.yearId),
          values.classRoll,
          student?.id
        ),
      alreadyEnrolled: (yearId) =>
        transfer && student?.enrolments.some((en) => String(en.yearId) === yearId)
          ? `${student.name} is already enrolled in ${nameOf(years, Number(yearId))}. Edit that enrolment instead.`
          : undefined,
      subjects: subjectSet
        ? { required: subjectSet.perStudentSubjectCount, picked: chosenIds.length }
        : undefined,
    })

    const result = schema.safeParse(v)
    const e = result.success ? {} : issuesToErrors(result.error)
    for (const exam of shownExams) {
      const parsed = boardResultSchema.safeParse({ ...emptyBoard, ...board[exam] })
      if (!parsed.success) Object.assign(e, issuesToErrors(parsed.error, `board.${exam}.`))
    }
    return e
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saveAndNew =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "new"
    const next = validate()
    setErrors(next)
    const count = Object.keys(next).length
    if (count) {
      toast.error(`Fix ${count} field${count === 1 ? "" : "s"} before saving.`)
      return
    }

    const yearId = Number(v.yearId)
    const newEnrolment: Enrolment = {
      yearId,
      medium: institute.enableMedium ? v.medium : "",
      classId: Number(v.classId),
      sectionId: toId(v.sectionId),
      branchId: section?.branchId ?? (institute.enableBranch ? toId(v.branchId) : null),
      shiftId: section?.shiftId ?? (institute.enableShift ? toId(v.shiftId) : null),
      version: section?.version || (institute.enableVersion ? v.version : ""),
      groupId: classGroups.length ? toId(v.groupId) : null,
      sessionId: needsSession ? toId(v.sessionId) : null,
      houseId: institute.enableStudentHouse ? toId(v.houseId) : null,
      // An institute that hides rolls keeps whatever roll was there.
      classRoll: showRoll ? v.classRoll.trim() : transfer ? "" : (enrolment?.classRoll ?? ""),
      studentType: v.studentType,
      bankId: v.bankId.trim(),
      subjectIds: chosenIds,
      optionalSubjectId: optionalId,
    }
    const yearRank = new Map(years.map((y) => [y.id, y.rank]))
    const enrolments = [
      ...(student?.enrolments ?? []).filter((e) => e.yearId !== yearId),
      newEnrolment,
    ].sort((a, b) => (yearRank.get(a.yearId) ?? 0) - (yearRank.get(b.yearId) ?? 0))

    // Only keep board results that have something filled in.
    const boardResults = Object.fromEntries(
      Object.entries(board).filter(([, result]) => hasBoardData(result))
    )

    const trim = (value: string) => value.trim()
    const input: StudentInput = {
      instituteId: institute.id,
      studentIdentificationNo: Number(v.studentIdentificationNo),
      name: trim(v.name),
      gender: v.gender,
      dateOfBirth: v.dateOfBirth,
      bloodGroup: v.bloodGroup,
      religion: v.religion,
      primaryMobile: trim(v.primaryMobile),
      districtId: toId(v.districtId),
      categoryId: institute.enableStudentCategory ? toId(v.categoryId) : null,
      imageUrl: v.imageUrl,
      email: trim(v.email),
      presentAddress: trim(v.presentAddress),
      isSameAs: v.isSameAs,
      permanentAddress: v.isSameAs ? trim(v.presentAddress) : trim(v.permanentAddress),
      medicalHistory: trim(v.medicalHistory),
      hobby: trim(v.hobby),
      fatherName: trim(v.fatherName),
      fatherMobile: trim(v.fatherMobile),
      fatherEmail: trim(v.fatherEmail),
      fatherProfession: trim(v.fatherProfession),
      motherName: trim(v.motherName),
      motherMobile: trim(v.motherMobile),
      motherEmail: trim(v.motherEmail),
      motherProfession: trim(v.motherProfession),
      guardianName: trim(v.guardianName),
      guardianMobile: trim(v.guardianMobile),
      guardianRelation: trim(v.guardianRelation),
      guardianAddress: trim(v.guardianAddress),
      primaryCommunicationPerson: v.primaryCommunicationPerson,
      board: boardResults,
      enrolments,
      status: v.status,
    }

    if (student) updateStudent(student.id, input)
    else addStudent(input)

    if (saveAndNew && onSaveAndNew) {
      toast.success(`${input.name} admitted. Add the next student.`)
      onSaveAndNew()
      return
    }
    toast.success(
      transfer
        ? `${input.name} transferred to ${selectedClass?.name ?? "the new class"} ${nameOf(years, yearId)}`
        : `${input.name} ${student ? "updated" : "admitted"}`
    )
    router.push(listHref)
  }

  // ---- Field helpers ----
  const text = (key: keyof Values) => ({
    id: key,
    value: String(v[key]),
    "aria-invalid": !!errors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, event.target.value as never),
  })
  const mobileInput = (key: keyof Values) => ({
    ...text(key),
    inputMode: "tel" as const,
    placeholder: "01XXXXXXXXX",
  })

  const form = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Fieldset legend="Basic Information">
        <div className="grid gap-4 lg:grid-cols-[11rem_1fr_1fr]">
          <PhotoField
            value={v.imageUrl}
            error={errors.imageUrl}
            onChange={handleImage}
            onClear={() => set("imageUrl", "")}
          />
          <InfoTable>
            <TextField
              label={studentIdLabel(institute)}
              required
              error={errors.studentIdentificationNo}
              description={autoId ? "Given automatically by the institute's numbering." : undefined}
              input={{
                ...text("studentIdentificationNo"),
                inputMode: "numeric",
                readOnly: autoId && !student,
              }}
            />
            <TextField label="Full name" required error={errors.name} input={text("name")} />
            <TextField label="Father's name" input={text("fatherName")} />
            <TextField label="Mother's name" input={text("motherName")} />
            <TextField label="Guardian's name" input={text("guardianName")} />
            <TextField label="Guardian's relation" input={text("guardianRelation")} />
            <Pick
              label="Gender"
              required
              value={v.gender}
              onChange={(value) => set("gender", value as Values["gender"])}
              options={genders}
            />
            <TextField
              label="Date of birth"
              required
              error={errors.dateOfBirth}
              input={{ ...text("dateOfBirth"), type: "date" }}
            />
          </InfoTable>
          <InfoTable>
            <Pick
              label="District"
              required
              value={v.districtId}
              onChange={(value) => set("districtId", value)}
              options={active(districts, v.districtId).map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              placeholder="Select district"
              error={errors.districtId}
            />
            <TextField label="Primary mobile" error={errors.primaryMobile} input={mobileInput("primaryMobile")} />
            <TextField label="Guardian's mobile" error={errors.guardianMobile} input={mobileInput("guardianMobile")} />
            <TextField label="Father's mobile" error={errors.fatherMobile} input={mobileInput("fatherMobile")} />
            <TextField label="Mother's mobile" error={errors.motherMobile} input={mobileInput("motherMobile")} />
            <Pick
              label="Blood group"
              value={v.bloodGroup}
              onChange={(value) => set("bloodGroup", value)}
              options={bloodGroups}
              noneLabel="Select blood group"
            />
            <Pick
              label="Religion"
              value={v.religion}
              onChange={(value) => set("religion", value)}
              options={religions}
              noneLabel="Select religion"
            />
            <TextField label="Guardian address" input={text("guardianAddress")} />
          </InfoTable>
        </div>
      </Fieldset>

      <Fieldset
        legend="Academic Information"
        description={
          transfer
            ? "The student's new class. Their earlier years are kept as history."
            : student
              ? "The student's class for the chosen year. Other years are kept as history."
              : undefined
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoTable>
            {institute.enableBranch && (
              <Pick
                label="Branch"
                required
                value={v.branchId}
                onChange={(value) => setFilter("branchId", value)}
                options={active(branches, v.branchId).map((b) => ({
                  value: String(b.id),
                  label: b.name,
                }))}
                placeholder="Select branch"
                error={errors.branchId}
              />
            )}
            {institute.enableMedium && (
              <Pick
                label="Medium"
                required
                value={v.medium}
                onChange={(value) => set("medium", value)}
                options={academicMediums}
                error={errors.medium}
              />
            )}
            <Pick
              label="Class"
              required
              value={v.classId}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  classId: value,
                  sectionId: "",
                  groupId: "",
                  sessionId: "",
                }))
              }
              options={active(classes, v.classId).map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
              placeholder="Select class"
              error={errors.classId}
            />
            {showRoll && (
              <TextField
                label={classRollLabel(institute)}
                required
                error={errors.classRoll}
                input={text("classRoll")}
              />
            )}
            <Pick
              label="Academic year"
              required
              value={v.yearId}
              onChange={(value) => {
                // Switching to a year the student already has loads that
                // enrolment (not when transferring: that always starts anew).
                const existing = transfer
                  ? undefined
                  : student?.enrolments.find((e) => String(e.yearId) === value)
                setValues((current) => ({
                  ...current,
                  yearId: value,
                  ...(existing && {
                    medium: existing.medium,
                    classId: id(existing.classId),
                    branchId: id(existing.branchId),
                    shiftId: id(existing.shiftId),
                    version: existing.version,
                    groupId: id(existing.groupId),
                    sectionId: id(existing.sectionId),
                    sessionId: id(existing.sessionId),
                    houseId: id(existing.houseId),
                    classRoll: existing.classRoll,
                    studentType: existing.studentType,
                    bankId: existing.bankId,
                  }),
                }))
                if (existing) {
                  setPicked(existing.subjectIds)
                  setOptionalSubjectId(existing.optionalSubjectId)
                }
              }}
              options={active(years, v.yearId).map((y) => ({
                value: String(y.id),
                label: y.isCurrent ? `${y.name} (current)` : y.name,
              }))}
              placeholder="Select year"
              error={errors.yearId}
            />
            {classGroups.length > 0 && (
              <Pick
                label="Subject group"
                required
                value={v.groupId}
                onChange={(value) => setFilter("groupId", value)}
                options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                placeholder="Select group"
                error={errors.groupId}
              />
            )}
            {institute.enableVersion && (
              <Pick
                label="Academic version"
                required
                value={v.version}
                onChange={(value) => setFilter("version", value)}
                options={academicVersions}
                placeholder="Select version"
                error={errors.version}
              />
            )}
          </InfoTable>
          <InfoTable>
            {institute.enableShift && (
              <Pick
                label="Shift"
                required
                value={v.shiftId}
                onChange={(value) => setFilter("shiftId", value)}
                options={active(shifts, v.shiftId).map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
                placeholder="Select shift"
                error={errors.shiftId}
              />
            )}
            <Pick
              label="Academic section"
              required
              value={v.sectionId}
              onChange={pickSection}
              options={active(sectionOptions, v.sectionId).map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
              placeholder={
                !v.classId
                  ? "Pick a class first"
                  : sectionOptions.length
                    ? "Select section"
                    : "No section matches"
              }
              error={errors.sectionId}
              disabled={!sectionOptions.length}
            />
            {needsSession && (
              <Pick
                label="Student session"
                required
                value={v.sessionId}
                onChange={(value) => set("sessionId", value)}
                options={active(sessions, v.sessionId).map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
                placeholder="Select session"
                error={errors.sessionId}
              />
            )}
            {institute.enableStudentCategory && (
              <Pick
                label={institute.studentCategoryLabel.trim() || "Student category"}
                required
                value={v.categoryId}
                onChange={(value) => set("categoryId", value)}
                options={active(categories, v.categoryId).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                placeholder="Select category"
                error={errors.categoryId}
              />
            )}
            <Pick
              label="Student type"
              required
              value={v.studentType}
              onChange={(value) => set("studentType", value as Values["studentType"])}
              options={studentTypes}
            />
            {institute.enableStudentHouse && (
              <Pick
                label={institute.studentHouseLabel.trim() || "Student house"}
                required
                value={v.houseId}
                onChange={(value) => set("houseId", value)}
                // Houses for all, or for this student's medium and class.
                options={active(
                  houses.filter(
                    (h) =>
                      String(h.id) === v.houseId ||
                      ((!h.medium || !institute.enableMedium || h.medium === v.medium) &&
                        (h.classId == null || String(h.classId) === v.classId))
                  ),
                  v.houseId
                ).map((h) => ({
                  value: String(h.id),
                  label: h.name,
                }))}
                placeholder="Select house"
                error={errors.houseId}
              />
            )}
            <TextField label="Bank ID" input={text("bankId")} />
            <Pick
              label="Status"
              value={v.status}
              onChange={(value) => set("status", value as RecordStatus)}
              options={recordStatuses}
            />
          </InfoTable>
        </div>

        {/* Subjects sit under the academic tables, as in the legacy form. */}
        <div className="flex flex-col gap-2 border-t pt-4">
          <div>
            <h4 className="text-sm font-semibold">Subjects</h4>
            <p className="text-sm text-muted-foreground">
              {subjectSet
                ? `Each student of this class takes ${subjectSet.perStudentSubjectCount}. Compulsory subjects are always included; at most one can be optional.`
                : "The subjects this student takes."}
            </p>
          </div>
          {!v.classId || !v.yearId ? (
            <p className="text-sm text-muted-foreground">Pick a class and year to see its subjects.</p>
          ) : !subjectSet ? (
            <p className="text-sm text-muted-foreground">
              No subjects are set up for this class and year yet.{" "}
              <Link
                href={`/institutes/${institute.id}/class-subjects/new`}
                className="text-foreground underline underline-offset-4"
              >
                Add class year subjects
              </Link>
            </p>
          ) : classGroups.length && !v.groupId ? (
            <p className="text-sm text-muted-foreground">Pick a subject group to see its subjects.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-24 text-center">Select subject</TableHead>
                    <TableHead>Subject code</TableHead>
                    <TableHead>Subject name</TableHead>
                    <TableHead>Subject type</TableHead>
                    <TableHead className="w-28 text-center">Is optional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offered.map((detail) => {
                    const subject = subjects.find((s) => s.id === detail.subjectId)
                    const compulsory = detail.subjectType === "Compulsory"
                    const checked = chosenIds.includes(detail.subjectId)
                    const label = subject?.name ?? "Unknown subject"
                    return (
                      <TableRow key={`${detail.subjectId}-${detail.groupId}`}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={checked}
                            disabled={compulsory}
                            aria-label={`Take ${label}`}
                            onCheckedChange={(next) => toggleSubject(detail.subjectId, next === true)}
                          />
                        </TableCell>
                        <TableCell className="tabular-nums">{subject?.code ?? "—"}</TableCell>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>
                          <Badge variant={compulsory ? "secondary" : "outline"}>
                            {detail.subjectType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={optionalId === detail.subjectId}
                            disabled={compulsory}
                            aria-label={`${label} is the optional subject`}
                            onCheckedChange={(next) => toggleOptional(detail.subjectId, next === true)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {errors.subjects && <p className="text-sm text-destructive">{errors.subjects}</p>}
        </div>
      </Fieldset>

      <Fieldset legend="Personal Information">
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoTable>
            <TextField label="Student's email" error={errors.email} input={{ ...text("email"), type: "email" }} />
            <TextField label="Father's email" error={errors.fatherEmail} input={{ ...text("fatherEmail"), type: "email" }} />
            <TextField label="Mother's email" error={errors.motherEmail} input={{ ...text("motherEmail"), type: "email" }} />
            <TextField label="Hobby" input={text("hobby")} />
            <Row label="Medical history" htmlFor="medicalHistory">
              <Textarea rows={2} className="resize-y" {...text("medicalHistory")} />
            </Row>
          </InfoTable>
          <InfoTable>
            <TextField label="Present address" input={text("presentAddress")} />
            <Row label="Permanent address" htmlFor="permanentAddress">
              <Input
                {...text("permanentAddress")}
                value={v.isSameAs ? v.presentAddress : v.permanentAddress}
                readOnly={v.isSameAs}
                className={cn(v.isSameAs && "bg-muted")}
              />
              <Field orientation="horizontal" className="mt-2">
                <Checkbox
                  id="isSameAs"
                  checked={v.isSameAs}
                  onCheckedChange={(checked) => set("isSameAs", checked === true)}
                />
                <FieldLabel htmlFor="isSameAs" className="font-normal">
                  Same as present address
                </FieldLabel>
              </Field>
            </Row>
            <TextField label="Father's profession" input={text("fatherProfession")} />
            <TextField label="Mother's profession" input={text("motherProfession")} />
            <Row label="Primary communication person">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={v.primaryCommunicationPerson}
                onValueChange={(value) => {
                  if (value) set("primaryCommunicationPerson", value as CommunicationPerson)
                }}
                className="w-fit"
              >
                {communicationPersons.map((person) => (
                  <ToggleGroupItem key={person} value={person} className="px-3">
                    {person}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
          </InfoTable>
        </div>
      </Fieldset>

      {shownExams.length > 0 && (
        <Fieldset legend="Board Information">
          <div className="grid gap-4 lg:grid-cols-2">
            {shownExams.map((exam) => (
              <InfoTable key={exam}>
                <div className="bg-muted px-3 py-2 text-center text-sm font-semibold">{exam}</div>
                {boardFields
                  .filter((field) => field.key !== "eiin" || !noEiin.includes(exam))
                  .map((field) => {
                    const key = `board.${exam}.${field.key}`
                    return (
                      <Row key={field.key} label={field.label} htmlFor={key} error={errors[key]}>
                        <Input
                          id={key}
                          value={board[exam]?.[field.key] ?? ""}
                          aria-invalid={!!errors[key]}
                          inputMode={
                            field.key === "gpa" || field.key === "totalMarks" ? "decimal" : undefined
                          }
                          onChange={(event) =>
                            setBoard((current) => ({
                              ...current,
                              [exam]: {
                                ...emptyBoard,
                                ...current[exam],
                                [field.key]: event.target.value,
                              },
                            }))
                          }
                        />
                      </Row>
                    )
                  })}
              </InfoTable>
            ))}
          </div>
        </Fieldset>
      )}

      <div className="sticky bottom-0 z-10 -mx-(--card-spacing) -mb-(--card-spacing) flex justify-center gap-2 rounded-b-xl border-t bg-card px-(--card-spacing) py-3">
        {onSaveAndNew && (
          <Button type="submit" variant="secondary" value="new">
            Save and new
          </Button>
        )}
        <Button type="submit" value="save">
          {transfer ? "Transfer student" : student ? "Save changes" : "Save"}
        </Button>
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  )

  if (embedded) return form
  return (
    <FormPanel
      title={transfer ? "Transfer Student" : "Edit Student"}
      subtitle={`${student?.name}${manyInstitutes ? ` · ${institute.name}` : ""}${
        transferFrom
          ? ` · previously ${nameOf(classes, transferFrom.classId)}${
              transferFrom.sectionId != null
                ? `, Section ${nameOf(sections, transferFrom.sectionId)}`
                : ""
            }${transferFrom.classRoll ? `, Roll ${transferFrom.classRoll}` : ""} in ${nameOf(years, transferFrom.yearId)}`
          : ""
      }`}
      listHref={listHref}
    >
      {form}
    </FormPanel>
  )
}

// A bordered section with a legend, like the legacy <fieldset>.
export function Fieldset({
  legend,
  description,
  children,
}: {
  legend: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
      <legend className="rounded-md border bg-muted px-3 py-1 text-sm font-semibold">
        {legend}
      </legend>
      {description && <p className="-mt-2 text-sm text-muted-foreground">{description}</p>}
      {children}
    </fieldset>
  )
}

// The legacy "info-table": bordered rows of label and input.
export function InfoTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-fit flex-col divide-y overflow-hidden rounded-md border">
      {children}
    </div>
  )
}

// One label | input row of an info table; stacks on narrow screens.
export function Row({
  label,
  required,
  htmlFor,
  error,
  description,
  children,
}: {
  label: string
  required?: boolean
  htmlFor?: string
  error?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Field
      data-invalid={!!error}
      className="grid gap-0 sm:grid-cols-[minmax(8rem,40%)_1fr]"
    >
      <FieldLabel
        htmlFor={htmlFor}
        className="bg-muted/50 px-3 pt-2 text-sm font-medium sm:items-center sm:justify-end sm:border-r sm:py-2 sm:text-right"
      >
        <span>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </span>
      </FieldLabel>
      <div className="flex min-w-0 flex-col gap-1 p-2">
        {children}
        {description && <FieldDescription className="text-xs">{description}</FieldDescription>}
        <FieldError className="text-xs">{error}</FieldError>
      </div>
    </Field>
  )
}

// The legacy photo column: a large preview with the file picker below it.
function PhotoField({
  value,
  error,
  onChange,
  onClear,
}: {
  value: string
  error?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <Field data-invalid={!!error} className="mx-auto w-full max-w-44 gap-2">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Student" className="size-full object-cover" />
        ) : (
          <UserIcon className="size-12" />
        )}
      </div>
      <FieldLabel htmlFor="photo" className="sr-only">
        Photo
      </FieldLabel>
      <Input id="photo" type="file" accept=".jpg,.jpeg,.png" aria-invalid={!!error} onChange={onChange} className="text-xs" />
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <XIcon data-icon="inline-start" />
          Remove photo
        </Button>
      )}
      <FieldError className="text-xs">{error}</FieldError>
    </Field>
  )
}

export function TextField({
  label,
  required,
  error,
  description,
  input,
}: {
  label: string
  required?: boolean
  error?: string
  description?: string
  input: React.ComponentProps<typeof Input> & { id: string }
}) {
  return (
    <Row
      label={label}
      required={required}
      htmlFor={input.id}
      error={error}
      description={description}
    >
      <Input
        {...input}
        aria-required={required}
        className={cn(input.readOnly && "bg-muted", input.className)}
      />
    </Row>
  )
}

export function Pick({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  noneLabel,
  description,
  error,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: readonly string[] | { value: string; label: string }[]
  placeholder?: string
  // Offers a blank choice with this label.
  noneLabel?: string
  description?: string
  error?: string
  disabled?: boolean
}) {
  const inputId = `pick-${label.toLowerCase().replace(/\W+/g, "-")}`
  const items = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  )
  return (
    <Row
      label={label}
      required={required}
      htmlFor={inputId}
      error={error}
      description={description}
    >
      <Select
        value={value === "" && noneLabel ? NONE : value}
        onValueChange={(next) => onChange(next === NONE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={inputId} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Row>
  )
}
