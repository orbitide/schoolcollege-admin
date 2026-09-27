import { z } from "zod"

import { recordStatuses } from "@/lib/institutes"
import {
  communicationPersons,
  genders,
  MOBILE_ERROR,
  MOBILE_PATTERN,
  studentTypes,
} from "@/lib/students"

/**
 * The legacy Student/CreateEdit rules (CreateEditStudentViewModel plus the red
 * asterisks of Views/Student/CreateEdit.cshtml). Fields are strings as the
 * inputs produce them; ids are "" when unset.
 *
 * Which academic fields are required depends on the institute (branch,
 * medium, version, shift, category, house, class roll) and on the chosen
 * class (group, session), and some checks need the stores (unique student ID
 * and roll, one enrolment per year). The form passes those in as a
 * {@link StudentSchemaContext} and they are checked in `superRefine`.
 */

const text = z.string()

// Optional, but when given it must be a proper Bangladeshi mobile number.
const mobile = z
  .string()
  .trim()
  .refine((value) => !value || MOBILE_PATTERN.test(value), MOBILE_ERROR)

// Optional, but when given it must be an email address.
const email = z
  .string()
  .trim()
  .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.")

export const studentFormObject = z.object({
  // Basic information
  studentIdentificationNo: z.string().trim(),
  name: z.string().trim().min(1, "Full name is required."),
  fatherName: text,
  motherName: text,
  guardianName: text,
  guardianRelation: text,
  gender: z.enum(genders),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine(
      (value) => !value || value <= new Date().toISOString().slice(0, 10),
      "Date of birth can't be in the future."
    ),
  districtId: z.string().min(1, "District is required."),
  primaryMobile: mobile,
  guardianMobile: mobile,
  fatherMobile: mobile,
  motherMobile: mobile,
  bloodGroup: text,
  religion: text,
  guardianAddress: text,
  imageUrl: text,
  status: z.enum(recordStatuses),

  // Academic information (the enrolment for the chosen year)
  branchId: text,
  medium: text,
  classId: z.string().min(1, "Class is required."),
  classRoll: z.string().trim(),
  yearId: z.string().min(1, "Academic year is required."),
  groupId: text,
  version: text,
  shiftId: text,
  sectionId: text,
  sessionId: text,
  categoryId: text,
  studentType: z.enum(studentTypes),
  houseId: text,
  bankId: text,

  // Personal information
  email,
  fatherEmail: email,
  motherEmail: email,
  hobby: text,
  medicalHistory: text,
  presentAddress: text,
  isSameAs: z.boolean(),
  permanentAddress: text,
  fatherProfession: text,
  motherProfession: text,
  primaryCommunicationPerson: z.enum(communicationPersons),
})

export type StudentFormValues = z.infer<typeof studentFormObject>

export type StudentSchemaContext = {
  studentIdLabel: string
  classRollLabel: string
  categoryLabel: string
  houseLabel: string
  // Fields the institute or the chosen class makes required.
  requires: {
    branch: boolean
    medium: boolean
    version: boolean
    shift: boolean
    group: boolean
    section: boolean
    session: boolean
    category: boolean
    house: boolean
    classRoll: boolean
  }
  isStudentIdTaken: (studentId: number) => boolean
  isRollTaken: (values: StudentFormValues) => boolean
  // A message when the student already has an enrolment in that year and
  // may not get another (transfers).
  alreadyEnrolled: (yearId: string) => string | undefined
  // Set when the class has a subject list for the year.
  subjects?: { required: number; picked: number }
}

export function studentFormSchema(ctx: StudentSchemaContext) {
  return studentFormObject.superRefine((values, issue) => {
    const add = (path: string, message: string) =>
      issue.addIssue({ code: "custom", path: [path], message })
    const require = (path: keyof StudentFormValues, label: string, when: boolean) => {
      if (when && !String(values[path]).trim()) add(path, `${label} is required.`)
    }

    // Student ID: required, a whole number, unique in the institute.
    const sid = Number(values.studentIdentificationNo)
    if (!values.studentIdentificationNo) {
      add("studentIdentificationNo", `${ctx.studentIdLabel} is required.`)
    } else if (!Number.isInteger(sid) || sid < 1) {
      add("studentIdentificationNo", "Enter a whole number.")
    } else if (ctx.isStudentIdTaken(sid)) {
      add(
        "studentIdentificationNo",
        `Another student already has this ${ctx.studentIdLabel.toLowerCase()}.`
      )
    }

    const { requires } = ctx
    require("branchId", "Branch", requires.branch)
    require("medium", "Medium", requires.medium)
    require("groupId", "Subject group", requires.group)
    require("version", "Academic version", requires.version)
    require("shiftId", "Shift", requires.shift)
    require("sectionId", "Section", requires.section)
    require("sessionId", "Student session", requires.session)
    require("categoryId", ctx.categoryLabel, requires.category)
    require("houseId", ctx.houseLabel, requires.house)

    const enrolled = values.yearId ? ctx.alreadyEnrolled(values.yearId) : undefined
    if (enrolled) add("yearId", enrolled)

    // Class roll: unique within the class and year, when the institute uses it.
    if (requires.classRoll) {
      if (!values.classRoll) add("classRoll", `${ctx.classRollLabel} is required.`)
      else if (values.classId && values.yearId && ctx.isRollTaken(values)) {
        add(
          "classRoll",
          `Another student in this class and year has this ${ctx.classRollLabel.toLowerCase()}.`
        )
      }
    }

    if (ctx.subjects && ctx.subjects.picked !== ctx.subjects.required) {
      add(
        "subjects",
        `Pick ${ctx.subjects.required} subjects; ${ctx.subjects.picked} picked.`
      )
    }
  })
}

// Board results of one public exam; all optional, GPA between 0 and 5.
export const boardResultSchema = z.object({
  passingYear: text,
  board: text,
  roll: text,
  registrationNo: text,
  gpa: z
    .string()
    .trim()
    .refine(
      (value) => !value || (Number(value) >= 0 && Number(value) <= 5),
      "GPA must be between 0 and 5."
    ),
  totalMarks: text,
  eiin: text,
})

// Zod issues as a field → first message map, e.g. { "board.SSC.gpa": "…" }.
export function issuesToErrors(error: z.ZodError, prefix = "") {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = prefix + issue.path.join(".")
    errors[key] ??= issue.message
  }
  return errors
}
