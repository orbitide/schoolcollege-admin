"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import {
  getQuestions,
  MCQ_OPTIONS,
  questionChapterStore,
  questionMarks,
  type Question,
  type QuestionLevel,
  type QuestionType,
} from "@/lib/question-bank"
import { deleteAnswerKey, getTermExamAnswers, saveAnswerKeys } from "@/lib/term-exam-answers"
import { classYearExamSubjects, getTermExams, type TermExam } from "@/lib/term-exams"

// Generated question papers (legacy OnlineCollege TermExamQuestionManager:
// TermExamSubjectQuestionBasic, TermExamQuestion, TermExamQuestionSet and
// its details). A paper is one term exam subject's MCQ or CQ part: its
// settings, the blueprint it was drawn from (how many questions of each
// chapter and level), a copy of the questions picked, and up to four sets
// (A–D, as the OMR sheet has four set bubbles), each with its own question
// and option order. Picking and shuffling use a seeded generator, so the
// same seed gives the same paper. An MCQ paper writes each set's answer key
// to Manage Correct Answer. Approving locks the paper; Clear deletes it and
// its keys. In-memory like the rest of admin; replace with API calls once
// the backend endpoints exist.

export const SET_CODES = ["A", "B", "C", "D"] as const
export const MAX_SETS = SET_CODES.length
// The OMR sheet has room for 100 questions.
export const MAX_MCQ_QUESTIONS = 100

export type PaperSettings = {
  totalSets: number
  bangla: boolean
  english: boolean
  durationMinutes: number
  // Pages the printed paper should fit in (legacy TargetPage).
  targetPages: number
  // MCQ: marks for each question (legacy McqMarksPerQuestion).
  mcqMarksPerQuestion: number
  // CQ: how many of the questions a student answers (legacy CqNumberOfAnswerQuestion).
  cqAnswerCount: number
}

export type BlueprintRow = { chapterId: number; level: QuestionLevel; count: number }

// A question as it sits in a set: the order of its items (sub-questions
// under a stimulus) and of each item's options, as indexes into the
// question's own lists.
export type PaperUnit = { questionId: number; itemOrder: number[]; optionOrders: number[][] }
export type PaperSet = { setCode: string; units: PaperUnit[] }

export type PaperReplacement = {
  oldQuestionId: number
  newQuestionId: number
  reason: string
  by: string
  at: string
}

export const paperStatuses = ["Draft", "Approved", "Deleted"] as const
export type PaperStatus = (typeof paperStatuses)[number]

export type GeneratedPaper = {
  id: number
  instituteId: number
  termExamId: number
  subjectId: number
  type: QuestionType
  settings: PaperSettings
  blueprint: BlueprintRow[]
  seed: number
  // Copies of the questions as they were when picked.
  questions: Question[]
  sets: PaperSet[]
  replacements: PaperReplacement[]
  status: PaperStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

let papers: GeneratedPaper[] = []
const empty: GeneratedPaper[] = []
const listeners = new Set<() => void>()

function emit(next: GeneratedPaper[]) {
  logChanges("TermExamQuestionSet", papers, next)
  papers = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGeneratedPapers() {
  return React.useSyncExternalStore(subscribe, () => papers, () => empty)
}

export function useGeneratedPaper(id: number) {
  return useGeneratedPapers().find((p) => p.id === id)
}

export function getGeneratedPapers() {
  return papers
}

// The exam subject's paper of this type that isn't deleted, if any.
export function paperFor(termExamId: number, subjectId: number, type: QuestionType, all = papers) {
  return all.find(
    (p) => p.termExamId === termExamId && p.subjectId === subjectId && p.type === type && p.status !== "Deleted"
  )
}

// ---- Seeded random ----

// mulberry32: small, fast and the same everywhere for a given seed.
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: readonly T[], random: () => number) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const newSeed = () => Math.floor(Math.random() * 1_000_000) + 1

// ---- Requirements ----

export function examSubjectOf(exam: TermExam, subjectId: number) {
  return exam.subjects.find((s) => s.subjectId === subjectId)
}

// Marks per MCQ question the class-year subject set gives (legacy
// Subject.McqMarksPerQuestion), 1 when unset.
export function mcqMarksPerQuestion(exam: TermExam, subjectId: number) {
  return (
    classYearExamSubjects(exam.instituteId, exam.classId, exam.yearId, exam.medium, exam.groupId).find(
      (s) => s.subject.subjectId === subjectId
    )?.perMcq || 1
  )
}

export function defaultSettings(exam: TermExam, subjectId: number, type: QuestionType): PaperSettings {
  const cqMarks = examSubjectOf(exam, subjectId)?.cqMarks ?? 0
  return {
    totalSets: type === "MCQ" ? MAX_SETS : 1,
    bangla: true,
    english: false,
    durationMinutes: type === "MCQ" ? 30 : 150,
    targetPages: type === "MCQ" ? 1 : 2,
    mcqMarksPerQuestion: mcqMarksPerQuestion(exam, subjectId),
    cqAnswerCount: cqMarks && cqMarks % 10 === 0 ? cqMarks / 10 : 1,
  }
}

export type PaperRequirement = {
  // The part's full marks in the exam.
  marks: number
  // MCQ: exactly this many questions; CQ: at least `answerCount`.
  questions: number
  // CQ: the marks each question must carry.
  perQuestion: number
  error?: string
}

// What the exam subject asks of an MCQ or CQ paper (legacy: MCQ count ×
// marks per question must equal the subject's MCQ marks).
export function paperRequirement(
  exam: TermExam,
  subjectId: number,
  type: QuestionType,
  settings: PaperSettings
): PaperRequirement {
  const subject = examSubjectOf(exam, subjectId)
  const marks = type === "MCQ" ? (subject?.mcqMarks ?? 0) : (subject?.cqMarks ?? 0)
  if (!subject) return { marks: 0, questions: 0, perQuestion: 0, error: "The exam doesn't have this subject." }
  if (!marks) return { marks, questions: 0, perQuestion: 0, error: `The subject has no ${type} marks in this exam.` }
  if (type === "MCQ") {
    const per = settings.mcqMarksPerQuestion
    if (!(per > 0)) return { marks, questions: 0, perQuestion: 0, error: "Marks per question must be more than 0." }
    const questions = marks / per
    if (!Number.isInteger(questions))
      return { marks, questions: 0, perQuestion: per, error: `${marks} MCQ marks can't be split into questions of ${per} marks.` }
    if (questions > MAX_MCQ_QUESTIONS)
      return { marks, questions, perQuestion: per, error: `${questions} questions won't fit the OMR sheet (at most ${MAX_MCQ_QUESTIONS}).` }
    return { marks, questions, perQuestion: per }
  }
  const answer = settings.cqAnswerCount
  if (!(answer > 0) || !Number.isInteger(answer))
    return { marks, questions: 0, perQuestion: 0, error: "Enter how many questions students answer." }
  const perQuestion = marks / answer
  if (!Number.isInteger(perQuestion))
    return { marks, questions: answer, perQuestion: 0, error: `${marks} CQ marks can't be split over ${answer} answered questions.` }
  return { marks, questions: answer, perQuestion }
}

// Units a question counts for in a blueprint: an MCQ counts each of its
// items (a stimulus with two questions counts two), a CQ counts one.
export const questionCount = (q: Pick<Question, "type" | "items">) => (q.type === "MCQ" ? q.items.length : 1)

// Approved bank questions a paper may use: the exam's class and subject, the
// type, written in the paper's languages, and for a CQ carrying the marks
// each question must have.
export function eligibleQuestions(
  exam: TermExam,
  subjectId: number,
  type: QuestionType,
  settings: PaperSettings,
  requirement: PaperRequirement,
  all: Question[] = getQuestions()
) {
  return all.filter(
    (q) =>
      q.instituteId === exam.instituteId &&
      q.classId === exam.classId &&
      q.subjectId === subjectId &&
      q.type === type &&
      q.status === "Approved" &&
      (!settings.bangla || q.bangla) &&
      (!settings.english || q.english) &&
      (type === "MCQ" || questionMarks(q) === requirement.perQuestion)
  )
}

const cellKey = (chapterId: number, level: QuestionLevel) => `${chapterId}:${level}`

// How many units each chapter × level holds, e.g. for the blueprint grid.
export function availability(eligible: Question[]) {
  const counts = new Map<string, number>()
  for (const q of eligible) counts.set(cellKey(q.chapterId, q.level), (counts.get(cellKey(q.chapterId, q.level)) ?? 0) + questionCount(q))
  return { get: (chapterId: number, level: QuestionLevel) => counts.get(cellKey(chapterId, level)) ?? 0 }
}

// ---- Generating ----

function unitFor(q: Question, random: () => number): PaperUnit {
  const indexes = q.items.map((_, i) => i)
  const itemOrder = q.hasUddipok && q.shuffleItems ? shuffle(indexes, random) : indexes
  return {
    questionId: q.id,
    itemOrder,
    optionOrders: q.items.map((item) =>
      q.type !== "MCQ" ? [] : item.shuffleOptions ? shuffle(item.options.map((_, i) => i), random) : item.options.map((_, i) => i)
    ),
  }
}

// Each set orders the questions (a stimulus keeps its items together) and
// their options its own way.
function buildSets(picked: Question[], totalSets: number, seed: number): PaperSet[] {
  return SET_CODES.slice(0, totalSets).map((setCode, s) => {
    const random = seededRandom(seed * 31 + s + 1)
    return { setCode, units: shuffle(picked, random).map((q) => unitFor(q, random)) }
  })
}

export type GenerateInput = {
  exam: TermExam
  subjectId: number
  type: QuestionType
  settings: PaperSettings
  blueprint: BlueprintRow[]
  seed: number
}

const chapterName = (instituteId: number, id: number) =>
  questionChapterStore.getListWithDeleted(instituteId).find((c) => c.id === id)?.name ?? "a chapter"

// Why the blueprint can't make a paper yet; null when it can.
export function blueprintProblem(input: Omit<GenerateInput, "seed">) {
  const { exam, subjectId, type, settings, blueprint } = input
  if (!settings.bangla && !settings.english) return "Pick the paper's language."
  if (!(settings.totalSets >= 1 && settings.totalSets <= MAX_SETS)) return `Make 1 to ${MAX_SETS} sets.`
  const requirement = paperRequirement(exam, subjectId, type, settings)
  if (requirement.error) return requirement.error
  const total = blueprint.reduce((sum, row) => sum + row.count, 0)
  if (type === "MCQ" && total !== requirement.questions)
    return `Pick ${requirement.questions} questions; the blueprint has ${total}.`
  if (type === "CQ" && total < requirement.questions)
    return `Pick at least ${requirement.questions} questions (students answer ${requirement.questions}); the blueprint has ${total}.`
  const available = availability(eligibleQuestions(exam, subjectId, type, settings, requirement))
  for (const row of blueprint) {
    if (row.count > available.get(row.chapterId, row.level))
      return `${chapterName(exam.instituteId, row.chapterId)} has only ${available.get(row.chapterId, row.level)} approved ${row.level} questions.`
  }
  return null
}

// Legacy Generate: pick the blueprint's questions at random (a stimulus and
// its items together), then shuffle them into the sets. Replaces the exam
// subject's draft paper; an approved one has to be reopened first. An MCQ
// paper's keys go to Manage Correct Answer.
export function generatePaper(input: GenerateInput, user: string) {
  const problem = blueprintProblem(input)
  if (problem) throw new Error(problem)
  const { exam, subjectId, type, settings, blueprint, seed } = input
  const existing = paperFor(exam.id, subjectId, type)
  if (existing?.status === "Approved") throw new Error("The paper is approved. Reopen it before generating again.")

  const requirement = paperRequirement(exam, subjectId, type, settings)
  const eligible = eligibleQuestions(exam, subjectId, type, settings, requirement)
  const random = seededRandom(seed)
  const picked: Question[] = []
  for (const row of blueprint.filter((r) => r.count > 0)) {
    let remaining = row.count
    const candidates = shuffle(
      eligible.filter((q) => q.chapterId === row.chapterId && q.level === row.level),
      random
    )
    // A stimulus that doesn't fit what's left is passed over for smaller ones.
    for (const q of candidates) {
      if (!remaining) break
      if (questionCount(q) <= remaining) {
        picked.push(q)
        remaining -= questionCount(q)
      }
    }
    if (remaining)
      throw new Error(
        `${chapterName(exam.instituteId, row.chapterId)} (${row.level}) can't make exactly ${row.count}: its stimulus questions don't add up. Change the count or add questions.`
      )
  }

  const stamp = new Date().toISOString()
  const paper: GeneratedPaper = {
    id: existing?.id ?? Math.max(0, ...papers.map((p) => p.id)) + 1,
    instituteId: exam.instituteId,
    termExamId: exam.id,
    subjectId,
    type,
    settings,
    blueprint: blueprint.filter((r) => r.count > 0),
    seed,
    questions: structuredClone(picked),
    sets: buildSets(picked, settings.totalSets, seed),
    replacements: [],
    status: "Draft",
    createdBy: existing?.createdBy ?? user,
    createdAt: existing?.createdAt ?? stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit(existing ? papers.map((p) => (p.id === existing.id ? paper : p)) : [...papers, paper])
  syncAnswerKeys(paper, user, existing)
  return paper
}

// ---- Reading a set ----

export type PaperLine = {
  // 1-based question number on the paper.
  serial: number
  question: Question
  itemIndex: number
  // MCQ: the options' original indexes in printed order.
  optionOrder: number[]
  // The first item of a stimulus (the stimulus is printed before it), and
  // the numbers the stimulus covers.
  startsGroup: boolean
  groupRange: [number, number]
}

// The printed order of a set: one line per MCQ item, or per CQ.
export function paperLines(paper: GeneratedPaper, set: PaperSet): PaperLine[] {
  const byId = new Map(paper.questions.map((q) => [q.id, q]))
  const lines: PaperLine[] = []
  let serial = 0
  for (const unit of set.units) {
    const question = byId.get(unit.questionId)
    if (!question) continue
    if (question.type === "CQ") {
      serial++
      lines.push({ serial, question, itemIndex: -1, optionOrder: [], startsGroup: true, groupRange: [serial, serial] })
      continue
    }
    const first = serial + 1
    const last = serial + unit.itemOrder.length
    unit.itemOrder.forEach((itemIndex, k) => {
      serial++
      lines.push({
        serial,
        question,
        itemIndex,
        optionOrder: unit.optionOrders[itemIndex] ?? question.items[itemIndex].options.map((_, i) => i),
        startsGroup: k === 0,
        groupRange: [first, last],
      })
    })
  }
  return lines
}

// The printed letter of the line's correct option.
export function lineAnswer(line: PaperLine) {
  const item = line.question.items[line.itemIndex]
  if (!item) return ""
  const original = MCQ_OPTIONS.indexOf(item.answer as (typeof MCQ_OPTIONS)[number])
  const at = line.optionOrder.indexOf(original)
  return at >= 0 ? MCQ_OPTIONS[at] : ""
}

// The set's answer key in the legacy comma list.
export function setAnswerKey(paper: GeneratedPaper, set: PaperSet) {
  return paperLines(paper, set)
    .map(lineAnswer)
    .join(",")
}

// ---- Answer keys ----

// The saved keys an MCQ paper would overwrite, for a warning before
// generating (a key typed in Manage Correct Answer, say).
export function keysInTheWay(termExamId: number, subjectId: number, totalSets: number) {
  const codes = new Set<string>(SET_CODES.slice(0, totalSets).map((c) => c.toLowerCase()))
  return getTermExamAnswers().filter(
    (a) => a.termExamId === termExamId && a.subjectId === subjectId && codes.has(a.setCode.trim().toLowerCase())
  )
}

function removeKeys(paper: GeneratedPaper, codes: string[]) {
  const drop = new Set(codes.map((c) => c.toLowerCase()))
  for (const key of getTermExamAnswers()) {
    if (key.termExamId === paper.termExamId && key.subjectId === paper.subjectId && drop.has(key.setCode.trim().toLowerCase()))
      deleteAnswerKey(key.id)
  }
}

// Writes an MCQ paper's keys, dropping those of sets a previous version had
// but this one doesn't.
function syncAnswerKeys(paper: GeneratedPaper, user: string, previous?: GeneratedPaper) {
  if (paper.type !== "MCQ") return
  const codes = new Set(paper.sets.map((s) => s.setCode))
  if (previous) removeKeys(paper, previous.sets.map((s) => s.setCode).filter((c) => !codes.has(c)))
  saveAnswerKeys(
    paper.sets.map((set) => ({
      termExamId: paper.termExamId,
      subjectId: paper.subjectId,
      setCode: set.setCode,
      answer: setAnswerKey(paper, set),
    })),
    user
  )
}

// ---- Changes ----

const now = () => new Date().toISOString()

function patch(id: number, changes: Partial<GeneratedPaper>, user: string) {
  let updated: GeneratedPaper | undefined
  emit(
    papers.map((p) => {
      if (p.id !== id) return p
      updated = { ...p, ...changes, modifiedBy: user, modifiedAt: now() }
      return updated
    })
  )
  return updated
}

function examOf(paper: GeneratedPaper) {
  const exam = getTermExams().find((e) => e.id === paper.termExamId)
  if (!exam) throw new Error("The paper's exam no longer exists.")
  return exam
}

// Bank questions that could stand in for one of the paper's: eligible for
// the paper, not on it yet, and of the same shape (as many items for an
// MCQ; a CQ's marks are already checked).
export function replacementCandidates(paper: GeneratedPaper, questionId: number, all: Question[] = getQuestions()) {
  const old = paper.questions.find((q) => q.id === questionId)
  const exam = getTermExams().find((e) => e.id === paper.termExamId)
  if (!old || !exam) return []
  const requirement = paperRequirement(exam, paper.subjectId, paper.type, paper.settings)
  const used = new Set(paper.questions.map((q) => q.id))
  return eligibleQuestions(exam, paper.subjectId, paper.type, paper.settings, requirement, all).filter(
    (q) => !used.has(q.id) && questionCount(q) === questionCount(old) && q.items.length === old.items.length
  )
}

// Legacy replacement question: swap one question for another in every set,
// in the same place, and keep why (the original stays in the log).
export function replaceQuestion(paperId: number, oldQuestionId: number, newQuestionId: number, reason: string, user: string) {
  const paper = papers.find((p) => p.id === paperId)
  if (!paper || paper.status !== "Draft") throw new Error("Only a draft paper can be changed.")
  if (!reason.trim()) throw new Error("Say why the question is replaced.")
  const replacement = replacementCandidates(paper, oldQuestionId).find((q) => q.id === newQuestionId)
  if (!replacement) throw new Error("That question can't replace this one.")
  examOf(paper)
  const random = seededRandom(paper.seed * 97 + paper.replacements.length + 1)
  const sets = paper.sets.map((set) => ({
    ...set,
    units: set.units.map((unit) => (unit.questionId === oldQuestionId ? unitFor(replacement, random) : unit)),
  }))
  const updated = patch(
    paperId,
    {
      questions: paper.questions.map((q) => (q.id === oldQuestionId ? structuredClone(replacement) : q)),
      sets,
      replacements: [
        ...paper.replacements,
        { oldQuestionId, newQuestionId, reason: reason.trim(), by: user, at: now() },
      ],
    },
    user
  )
  if (updated) syncAnswerKeys(updated, user)
}

// Approve locks the paper for printing; Reopen makes it a draft again.
export function setPaperStatus(id: number, status: "Draft" | "Approved", user: string) {
  const paper = papers.find((p) => p.id === id)
  if (!paper || paper.status === "Deleted" || paper.status === status) return
  patch(id, { status }, user)
}

// Legacy Clear Generate Question: the paper is deleted (Admin can retrieve
// it) and its answer keys removed.
export function clearPaper(id: number, user: string) {
  const paper = papers.find((p) => p.id === id)
  if (!paper || paper.status === "Deleted") return
  if (paper.type === "MCQ") removeKeys(paper, paper.sets.map((s) => s.setCode))
  patch(id, { status: "Deleted" }, user)
}

// Back as a draft with its keys, unless the exam subject has another paper
// of the type by now.
export function retrievePaper(id: number, user: string) {
  const paper = papers.find((p) => p.id === id)
  if (!paper || paper.status !== "Deleted") return
  if (paperFor(paper.termExamId, paper.subjectId, paper.type))
    throw new Error("The exam subject has another paper of this type now.")
  const updated = patch(id, { status: "Draft" }, user)
  if (updated) syncAnswerKeys(updated, user)
}

export function deletePaperPermanently(id: number) {
  emit(papers.filter((p) => p.id !== id))
}

export function removeInstitutePapers(instituteId: number) {
  emit(papers.filter((p) => p.instituteId !== instituteId))
}

// How many MCQs the exam subject's OMR sheet carries: the generated MCQ
// paper's count when there is one, else the MCQ marks over the marks per
// question. The printed sheet and the scanner both use it.
export function mcqQuestionCount(exam: TermExam, subjectId: number, all = papers) {
  const paper = paperFor(exam.id, subjectId, "MCQ", all)
  if (paper?.sets[0]) return paperLines(paper, paper.sets[0]).length
  const marks = examSubjectOf(exam, subjectId)?.mcqMarks ?? 0
  return Math.min(MAX_MCQ_QUESTIONS, Math.floor(marks / mcqMarksPerQuestion(exam, subjectId)))
}
