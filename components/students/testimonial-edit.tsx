"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Fieldset,
  FormPanel,
  InfoTable,
  Pick,
  Row,
  TextField,
} from "@/components/students/student-form"
import { classRollLabel, useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classStore } from "@/lib/academic-store"
import { useInstitute } from "@/lib/institutes-store"
import {
  issuesToErrors,
  testimonialBoardSchema,
  testimonialEditSchema,
  type TestimonialEditValues,
} from "@/lib/schemas/student"
import {
  genders,
  testimonialEnrolment,
  updateStudent,
  useStudent,
  type BoardResult,
  type PublicExam,
} from "@/lib/students"

// The board fields a testimonial prints (the legacy edit page has no EIIN).
const boardFields: { key: keyof BoardResult; label: string }[] = [
  { key: "passingYear", label: "Passing year" },
  { key: "board", label: "Board" },
  { key: "roll", label: "Roll" },
  { key: "registrationNo", label: "Registration no." },
  { key: "gpa", label: "GPA" },
  { key: "totalMarks", label: "Total marks" },
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

// Legacy EditStudentTestimonial: correct what a student's testimonials print
// — name, parents, gender, birth date and the results of every exam their
// class issues testimonials for.
export function TestimonialEdit({ studentId }: { studentId: number }) {
  const searchParams = useSearchParams()
  const student = useStudent(studentId)
  const institute = useInstitute(student?.instituteId ?? -1)
  const classes = classStore.useList(student?.instituteId ?? -1)
  const returnTo = searchParams.get("returnTo")
  const listHref = returnTo?.startsWith("/students/testimonials")
    ? returnTo
    : "/students/testimonials"

  if (!student || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Student not found</h2>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to testimonials</Link>
        </Button>
      </div>
    )
  }

  const wanted = searchParams.get("type") as PublicExam | null
  // The class the testimonials are about, and the exams it issues them for.
  const enrolment =
    (wanted && testimonialEnrolment(student, wanted, classes)) ||
    [...student.enrolments]
      .reverse()
      .find((e) => classes.find((c) => c.id === e.classId)?.testimonialExams.length)
  const academicClass = classes.find((c) => c.id === enrolment?.classId)
  const exams = (academicClass?.testimonialExams ?? []) as PublicExam[]

  return (
    <TestimonialEditBody
      key={student.id}
      studentId={student.id}
      listHref={listHref}
      exams={exams}
      printExam={wanted && exams.includes(wanted) ? wanted : exams[0]}
    />
  )
}

function TestimonialEditBody({
  studentId,
  listHref,
  exams,
  printExam,
}: {
  studentId: number
  listHref: string
  exams: PublicExam[]
  printExam?: PublicExam
}) {
  const router = useRouter()
  const student = useStudent(studentId)!
  const institute = useInstitute(student.instituteId)!
  const classes = classStore.useList(student.instituteId)
  const name = useStudentLookups()
  const enrolment =
    (printExam && testimonialEnrolment(student, printExam, classes)) ||
    student.enrolments[student.enrolments.length - 1]

  const [values, setValues] = React.useState<TestimonialEditValues>(() => ({
    name: student.name,
    fatherName: student.fatherName,
    motherName: student.motherName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
  }))
  const [board, setBoard] = React.useState(student.board)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const set = <K extends keyof TestimonialEditValues>(key: K, value: TestimonialEditValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const text = (key: keyof TestimonialEditValues) => ({
    id: key,
    value: String(values[key]),
    "aria-invalid": !!errors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      set(key, event.target.value as never),
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = testimonialEditSchema.safeParse(values)
    const next = parsed.success ? {} : issuesToErrors(parsed.error)
    for (const exam of exams) {
      const result = testimonialBoardSchema.safeParse({ ...emptyBoard, ...board[exam] })
      if (!result.success) Object.assign(next, issuesToErrors(result.error, `board.${exam}.`))
    }
    setErrors(next)
    if (!parsed.success || Object.keys(next).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateStudent(student.id, {
      ...parsed.data,
      board: Object.fromEntries(
        Object.entries(board).filter(([, result]) =>
          Object.values(result ?? {}).some((value) => value.trim())
        )
      ),
    })
    toast.success(`${parsed.data.name}'s testimonial details saved`)
    router.push(listHref)
  }

  const academic: [string, string][] = [
    ["Class", name("class", enrolment?.classId)],
    ["Section", name("section", enrolment?.sectionId)],
    ["Academic year", name("year", enrolment?.yearId)],
    ...(institute.enableBranch ? [["Branch", name("branch", enrolment?.branchId)] as [string, string]] : []),
    ...(institute.enableShift ? [["Shift", name("shift", enrolment?.shiftId)] as [string, string]] : []),
    ...(institute.enableMedium ? [["Medium", enrolment?.medium || "—"] as [string, string]] : []),
    ...(institute.enableVersion ? [["Version", enrolment?.version || "—"] as [string, string]] : []),
    ...(institute.enableGroup ? [["Group", name("group", enrolment?.groupId)] as [string, string]] : []),
    ...(enrolment?.sessionId != null ? [["Session", name("session", enrolment.sessionId)] as [string, string]] : []),
    ["Student type", enrolment?.studentType ?? "—"],
  ]

  return (
    <FormPanel
      title="Edit Student Testimonial"
      subtitle={`${student.name} · ${institute.name}`}
      listHref={listHref}
      listLabel="Manage Testimonial"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Fieldset legend="Basic Information">
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoTable>
              <Row label={classRollLabel(institute)}>
                <p className="px-1 py-1.5 text-sm font-medium">{enrolment?.classRoll || "—"}</p>
              </Row>
              <TextField label="Name" required error={errors.name} input={text("name")} />
              <TextField label="Father's name" input={text("fatherName")} />
              <TextField label="Mother's name" input={text("motherName")} />
              <Pick
                label="Gender"
                required
                value={values.gender}
                onChange={(value) => set("gender", value as TestimonialEditValues["gender"])}
                options={genders}
              />
              <TextField
                label="Date of birth"
                error={errors.dateOfBirth}
                input={{ ...text("dateOfBirth"), type: "date" }}
              />
            </InfoTable>
            <InfoTable>
              {academic.map(([label, value]) => (
                <Row key={label} label={label}>
                  <p className="px-1 py-1.5 text-sm">{value}</p>
                </Row>
              ))}
            </InfoTable>
          </div>
        </Fieldset>

        <Fieldset
          legend="Board Information"
          description={
            exams.length
              ? "The results printed on the testimonials this class issues."
              : "The student's class doesn't issue testimonials; enable them under Basic Settings → Academic Classes."
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {exams.map((exam) => (
              <InfoTable key={exam}>
                <div className="bg-muted px-3 py-2 text-center text-sm font-semibold">{exam}</div>
                {boardFields.map((field) => {
                  const key = `board.${exam}.${field.key}`
                  return (
                    <Row key={field.key} label={`${exam} ${field.label.toLowerCase()}`} htmlFor={key} error={errors[key]}>
                      <Input
                        id={key}
                        value={board[exam]?.[field.key] ?? ""}
                        aria-invalid={!!errors[key]}
                        inputMode={field.key === "board" ? undefined : "decimal"}
                        onChange={(event) =>
                          setBoard((current) => ({
                            ...current,
                            [exam]: { ...emptyBoard, ...current[exam], [field.key]: event.target.value },
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

        <div className="sticky bottom-0 z-10 -mx-(--card-spacing) -mb-(--card-spacing) flex flex-wrap justify-center gap-2 rounded-b-xl border-t bg-card px-(--card-spacing) py-3">
          <Button type="submit">Save</Button>
          {printExam && board[printExam]?.passingYear && (
            <Button asChild variant="secondary">
              <Link
                href={`/print/testimonial?student=${student.id}&type=${encodeURIComponent(printExam)}`}
              >
                <PrinterIcon data-icon="inline-start" />
                Testimonial
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={listHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </FormPanel>
  )
}
