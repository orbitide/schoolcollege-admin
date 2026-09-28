import type { TermExamAnswer } from "@/lib/term-exam-answers"
import { checkMcqAnswer, examStudents, isActiveMark, type TermExamStudentMark } from "@/lib/term-exam-marks"
import type { Enrolment, Student } from "@/lib/students"
import type { TermExam, TermExamSubject } from "@/lib/term-exams"

// Legacy RptResult/McqMarkChecker (TermExamStudentMarksRepository.
// LoadStudentTermExamMcqMarks, Partial/_mcqMarkChecker): each student's MCQ
// answer sheet in one subject of an exam, checked question by question
// against the answer key of the set they sat, to show how the MCQ marks
// were reached.

export type McqQuestion = {
  key: string
  given: string
  correct: boolean
  marks: number
}

export type McqCheck = {
  student: Student
  enrolment: Enrolment
  mark: TermExamStudentMark
  questions: McqQuestion[]
}

export function mcqMarkChecker(
  exam: TermExam,
  subject: TermExamSubject,
  options: {
    students: Student[]
    marks: TermExamStudentMark[]
    answers: TermExamAnswer[]
    sectionId: number
    roll: string
    // Legacy McqMarksPerQuestion.
    perCorrect: number
  }
): { checks: McqCheck[]; withoutSheet: number } {
  const keyOf = new Map(
    options.answers
      .filter((a) => a.termExamId === exam.id && a.subjectId === subject.subjectId)
      .map((a) => [a.setCode.trim().toUpperCase(), a.answer])
  )
  const markOf = new Map(
    options.marks
      .filter((m) => m.termExamId === exam.id && m.subjectId === subject.subjectId && isActiveMark(m))
      .map((m) => [m.studentId, m])
  )
  let withoutSheet = 0
  const checks = examStudents(exam, options.students).flatMap(({ student, enrolment }): McqCheck[] => {
    if (enrolment.sectionId !== options.sectionId) return []
    if (options.roll && enrolment.classRoll.trim() !== options.roll) return []
    const mark = markOf.get(student.id)
    // Legacy joins the mark to its set's answer key.
    const key = mark && keyOf.get(mark.setCode.trim().toUpperCase())
    if (!mark || key == null) return []
    if (!mark.mcqAnswer.trim()) {
      withoutSheet++
      return []
    }
    const keys = key.split(",")
    const given = mark.mcqAnswer.split(",")
    const questions = Array.from({ length: subject.mcqMarks }, (_, i): McqQuestion => {
      const correct = checkMcqAnswer(keys[i] ?? "", given[i] ?? "").correct
      return {
        key: (keys[i] ?? "").trim(),
        given: (given[i] ?? "").trim(),
        correct,
        marks: correct ? options.perCorrect : 0,
      }
    })
    return [{ student, enrolment, mark, questions }]
  })
  checks.sort((a, b) => a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true }))
  return { checks, withoutSheet }
}
