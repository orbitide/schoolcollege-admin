"use client"

import * as React from "react"

import type { TermExam } from "@/lib/term-exams"

// Legacy OnlineCollege TermExamSubjectCorrectAnswer: the MCQ answer key of
// one term exam subject for one question set. The key is stored as the legacy
// comma list, one entry per question, where an entry is the correct option or
// a special mark: "+" every student gets the marks, "-" every student loses
// them, "$" any answer gets the marks.

export const answerTypes = [
  { value: "option", label: "Correct option", code: "" },
  { value: "plus", label: "Plus marks", code: "+" },
  { value: "minus", label: "Minus marks", code: "-" },
  { value: "any", label: "If answered any, give marks", code: "$" },
] as const

export type AnswerType = (typeof answerTypes)[number]["value"]

export type AnswerCell = { type: AnswerType; value: string }

export type TermExamAnswer = {
  id: number
  termExamId: number
  subjectId: number
  setCode: string
  answer: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type TermExamAnswerInput = Pick<
  TermExamAnswer,
  "termExamId" | "subjectId" | "setCode" | "answer"
>

// A term exam's MCQ subjects and their question counts; as in the legacy
// system, an MCQ mark is one question.
export function mcqSubjects(exam: TermExam | undefined) {
  return (exam?.subjects ?? [])
    .filter((subject) => subject.mcqMarks > 0)
    .map((subject) => ({ subjectId: subject.subjectId, questions: subject.mcqMarks }))
}

// Legacy CreateEdit: split a saved key into one cell per question, padded
// (or cut) to the subject's question count.
export function parseAnswer(answer: string, questions: number): AnswerCell[] {
  const parts = answer ? answer.split(",") : []
  return Array.from({ length: questions }, (_, index) => {
    const part = (parts[index] ?? "").trim()
    const special = answerTypes.find((t) => t.code && t.code === part)
    return special ? { type: special.value, value: part } : { type: "option", value: part }
  })
}

export function buildAnswer(cells: AnswerCell[]) {
  return cells
    .map((cell) =>
      cell.type === "option"
        ? cell.value.trim().toUpperCase()
        : answerTypes.find((t) => t.value === cell.type)!.code
    )
    .join(",")
}

// Answers typed or pasted in one go: "A,B,C", "A B C" or "ABC".
export function splitAnswerText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return []
  const parts = /[,\s;]/.test(trimmed) ? trimmed.split(/[\s,;]+/) : [...trimmed]
  return parts.filter(Boolean).map((part) => part.toUpperCase())
}

const now = () => new Date().toISOString()
const seedUser = "Super Admin"
const seedStamp = "2026-06-02T10:15:00.000Z"

// Half Yearly (exam 1) Bangla and Mathematics, sets A and B.
const seed: TermExamAnswer[] = [
  [1, 1, "A", "ABCDABCDABCDABCDABCDABCDABCDAB"],
  [1, 1, "B", "BCDABCDABCDABCDABCDABCDAB+CDAB"],
  [1, 3, "A", "DCBADCBADCBADCBADCBA$CBADCBADC"],
].map(([termExamId, subjectId, setCode, key], index) => ({
  id: index + 1,
  termExamId: Number(termExamId),
  subjectId: Number(subjectId),
  setCode: String(setCode),
  answer: [...String(key)].join(","),
  createdBy: seedUser,
  createdAt: seedStamp,
  modifiedBy: seedUser,
  modifiedAt: seedStamp,
}))

// In-memory dummy store for the browser session, like the term exams.
// Replace with API calls once the backend endpoints exist.
let answers: TermExamAnswer[] = seed
const listeners = new Set<() => void>()

function emit(next: TermExamAnswer[]) {
  answers = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTermExamAnswers() {
  return answers
}

export function useTermExamAnswers() {
  return React.useSyncExternalStore(
    subscribe,
    () => answers,
    () => seed
  )
}

const sameKey = (a: TermExamAnswerInput, b: TermExamAnswerInput) =>
  a.termExamId === b.termExamId &&
  a.subjectId === b.subjectId &&
  a.setCode.trim().toLowerCase() === b.setCode.trim().toLowerCase()

// Another saved key for the same exam, subject and set, if any.
export function findAnswerKey(input: TermExamAnswerInput, exceptId?: number) {
  return answers.find((a) => a.id !== exceptId && sameKey(a, input))
}

// Legacy SaveList: each key replaces the one saved for the same exam, subject
// and set, or is added.
export function saveAnswerKeys(inputs: TermExamAnswerInput[], user: string) {
  let next = answers
  let nextId = Math.max(0, ...answers.map((a) => a.id)) + 1
  let added = 0
  let updated = 0
  const stamp = now()
  for (const input of inputs) {
    const clean = { ...input, setCode: input.setCode.trim() }
    const existing = next.find((a) => sameKey(a, clean))
    if (existing) {
      next = next.map((a) =>
        a.id === existing.id ? { ...a, answer: clean.answer, modifiedBy: user, modifiedAt: stamp } : a
      )
      updated++
    } else {
      next = [
        ...next,
        { ...clean, id: nextId++, createdBy: user, createdAt: stamp, modifiedBy: user, modifiedAt: stamp },
      ]
      added++
    }
  }
  emit(next)
  return { added, updated }
}

export function updateAnswerKey(id: number, input: TermExamAnswerInput, user: string) {
  emit(
    answers.map((a) =>
      a.id === id
        ? { ...a, ...input, setCode: input.setCode.trim(), modifiedBy: user, modifiedAt: now() }
        : a
    )
  )
}

export function deleteAnswerKey(id: number) {
  emit(answers.filter((a) => a.id !== id))
}
