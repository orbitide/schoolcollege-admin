"use client"

import { mcqMarksPerQuestion, paperFor, getGeneratedPapers } from "@/lib/question-papers"
import { getStudents, type Student } from "@/lib/students"
import { getTermExamAnswers, type TermExamAnswer } from "@/lib/term-exam-answers"
import { examStudents, scoreMcq, takesSubject, type MarkUpload } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Checks OMR Scan's readings (after the teacher's corrections) the way the
// legacy OMR API checked a scanner's upload (ApiController
// TermExamMarksUpload): the roll must be a student of the exam who takes the
// subject, once; the set must have an answer key. A good sheet is scored
// against its set's key (scoreMcq, as Marks Recalculation does) and becomes
// a mark upload with the answer string, set code and MCQ counts.

export type OmrSheetRow = {
  roll: string
  setCode: string
  // One entry per question: "", a letter, or letters for a multiple mark.
  answers: string[]
  // The scanner flagged something (a double or faint mark) nobody has
  // looked at yet.
  flagged: boolean
}

export type OmrScore = { correct: number; wrong: number; notAnswered: number; marks: number }

export type CheckedOmrRow = {
  status: "ok" | "warning" | "error"
  messages: string[]
  studentName?: string
  key?: TermExamAnswer
  score?: OmrScore
  upload?: MarkUpload
}

const ANSWER = /^[ABCD]{0,4}$/

// Marks per correct answer: the generated paper's setting when there is
// one, else the class-year subject's.
export function omrMarksPerCorrect(exam: TermExam, subjectId: number) {
  return paperFor(exam.id, subjectId, "MCQ", getGeneratedPapers())?.settings.mcqMarksPerQuestion ?? mcqMarksPerQuestion(exam, subjectId)
}

export function checkOmrRows(
  exam: TermExam,
  subjectId: number,
  rows: OmrSheetRow[],
  students: Student[] = getStudents(),
  keys: TermExamAnswer[] = getTermExamAnswers()
): CheckedOmrRow[] {
  const examSubject = exam.subjects.find((s) => s.subjectId === subjectId)
  const byRoll = new Map(examStudents(exam, students).map((s) => [s.enrolment.classRoll.trim(), s]))
  const perCorrect = omrMarksPerCorrect(exam, subjectId)
  const rollCount = new Map<string, number>()
  for (const row of rows) rollCount.set(row.roll.trim(), (rollCount.get(row.roll.trim()) ?? 0) + 1)

  return rows.map((row): CheckedOmrRow => {
    const messages: string[] = []
    const stop = (message: string, extra: Partial<CheckedOmrRow> = {}): CheckedOmrRow => ({
      status: "error",
      messages: [...messages, message],
      ...extra,
    })
    if (!examSubject || !examSubject.mcqMarks) return stop("The exam has no MCQ marks for this subject")

    const roll = row.roll.trim()
    if (roll.includes("?")) return stop("Roll has two marks in a column")
    if (!/^\d+$/.test(roll) || Number(roll) <= 0) return stop("No Roll")
    const found = byRoll.get(roll)
    if (!found) return stop("Invalid Roll")
    const studentName = found.student.name
    if (!takesSubject(found.enrolment, subjectId)) return stop("Student didn't taken this subject", { studentName })
    if ((rollCount.get(roll) ?? 0) > 1) return stop("Duplicate Roll", { studentName })

    const setCode = row.setCode.trim().toUpperCase()
    if (!setCode) return stop("No set code", { studentName })
    if (setCode.length > 1) return stop("Set code has more than one mark", { studentName })
    const key = keys.find(
      (k) => k.termExamId === exam.id && k.subjectId === subjectId && k.setCode.trim().toUpperCase() === setCode
    )
    if (!key) return stop(`No answer key for set ${setCode}`, { studentName })

    const answers = row.answers.map((a) => a.trim().toUpperCase())
    const bad = answers.findIndex((a) => !ANSWER.test(a))
    if (bad >= 0) return stop(`Question ${bad + 1}: use A–D only`, { studentName, key })

    const sheet = answers.join(",")
    const score: OmrScore = scoreMcq(key.answer, sheet, examSubject.mcqMarks, perCorrect) ?? {
      correct: 0,
      wrong: 0,
      notAnswered: answers.length,
      marks: 0,
    }
    if (score.marks > examSubject.mcqMarks) return stop(`MCQ marks ${score.marks} are more than ${examSubject.mcqMarks}`, { studentName, key })
    if (row.flagged) messages.push("Check the flagged answers")
    const multiple = answers.filter((a) => a.length > 1).length
    if (multiple) messages.push(`${multiple} question${multiple === 1 ? " has" : "s have"} more than one mark (counted wrong)`)

    return {
      status: messages.length ? "warning" : "ok",
      messages,
      studentName,
      key,
      score,
      upload: {
        termExamId: exam.id,
        studentId: found.student.id,
        subjectId,
        roll,
        isOptional: found.enrolment.optionalSubjectId === subjectId,
        setCode,
        mcqAnswer: sheet,
        mcqMarks: score.marks,
        mcqCorrectAnswer: score.correct,
        mcqWrongAnswer: score.wrong,
        mcqNotAnswer: score.notAnswered,
      },
    }
  })
}
