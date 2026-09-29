"use client"

import * as React from "react"

import { createRecordStore } from "@/lib/academic-store"
import { logChanges } from "@/lib/common-log"
import type { AcademicRecord } from "@/lib/institutes"

// Question bank (legacy OnlineCollege Question Manage, spec
// 06-exams-results/questions-and-mark-checking.md). Questions belong to a
// class, subject and chapter (and optionally a topic), in Bangla, English or
// both. An MCQ is one item, or several items sharing a stimulus (legacy
// IsUddipok); a CQ is a stimulus with its sub-questions ক/খ/গ/ঘ. Only
// Approved questions go into generated papers (legacy IsVerify); Retired
// ones are kept but no longer used. In-memory like the rest of admin;
// replace with API calls once the backend endpoints exist.

// ---- Chapters and topics ----

// A chapter of a class subject, or (with a parent) a topic of a chapter.
export type QuestionChapter = AcademicRecord & {
  nameBn: string
  classId: number
  subjectId: number
  parentId: number | null
}

const chapterSeed: [string, string][] = [
  ["Real Numbers", "বাস্তব সংখ্যা"],
  ["Sets and Functions", "সেট ও ফাংশন"],
  ["Algebraic Expressions", "বীজগাণিতিক রাশি"],
  ["Indices and Logarithms", "সূচক ও লগারিদম"],
  ["Linear Equations", "এক চলকবিশিষ্ট সমীকরণ"],
  ["Geometry", "জ্যামিতি"],
]

// Class Nine (4) General Mathematics (3) of institute 1, with two topics
// under Real Numbers.
export const questionChapterStore = createRecordStore<QuestionChapter>(
  "QuestionChapter",
  [
    ...chapterSeed.map(([name, nameBn], index) => ({
      id: index + 1,
      instituteId: 1,
      name,
      nameBn,
      classId: 4,
      subjectId: 3,
      parentId: null,
      rank: index + 1,
      status: "Active" as const,
    })),
    { id: 7, instituteId: 1, name: "Rational and irrational numbers", nameBn: "মূলদ ও অমূলদ সংখ্যা", classId: 4, subjectId: 3, parentId: 1, rank: 7, status: "Active" as const },
    { id: 8, instituteId: 1, name: "Recurring decimals", nameBn: "আবৃত্ত দশমিক", classId: 4, subjectId: 3, parentId: 1, rank: 8, status: "Active" as const },
  ],
  {
    // Class, subject, then each chapter followed by its topics.
    compare: (a, b) =>
      a.classId - b.classId ||
      a.subjectId - b.subjectId ||
      (a.parentId ?? a.id) - (b.parentId ?? b.id) ||
      Number(a.parentId != null) - Number(b.parentId != null) ||
      a.rank - b.rank,
  }
)

// ---- Questions ----

export const questionTypes = ["MCQ", "CQ"] as const
export type QuestionType = (typeof questionTypes)[number]

// Legacy DifficultyLevel.
export const difficultyLevels = [
  { value: 1, label: "Easiest" },
  { value: 2, label: "Easy" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Hardest" },
] as const

export const difficultyLabel = (value: number) =>
  difficultyLevels.find((d) => d.value === value)?.label ?? String(value)

// Legacy QuestionLevel (the cognitive levels of the creative question system).
export const questionLevels = ["Knowledge", "Comprehension", "Application", "Higher"] as const
export type QuestionLevel = (typeof questionLevels)[number]

export const questionStatuses = ["Draft", "Approved", "Retired", "Deleted"] as const
export type QuestionStatus = (typeof questionStatuses)[number]

// Options A–D as in the legacy system, or A–E for a question that needs a
// fifth (admission tests; the Admission Test OMR sheet has five bubbles).
export const MCQ_OPTIONS = ["A", "B", "C", "D", "E"] as const
export const MCQ_MIN_OPTIONS = 4
// A CQ has up to four sub-questions (ক, খ, গ, ঘ).
export const MAX_CQ_ITEMS = 4
// An MCQ stimulus groups a few questions.
export const MAX_MCQ_GROUP = 10

// Rich text (HTML from the question editor) in each language.
export type Bilingual = { bn: string; en: string }

export type QuestionItem = {
  text: Bilingual
  // MCQ: four or five options, in A–E order; CQ: none.
  options: Bilingual[]
  // MCQ: the correct option, "A"–"E"; CQ: "".
  answer: string
  solution: Bilingual
  // CQ: the sub-question's marks. MCQ marks are set per paper.
  marks: number
  // MCQ: a generated set may put the options in another order.
  shuffleOptions: boolean
}

export type Question = {
  id: number
  instituteId: number
  classId: number
  subjectId: number
  chapterId: number
  topicId: number | null
  type: QuestionType
  difficulty: number
  level: QuestionLevel
  bangla: boolean
  english: boolean
  // The stimulus (legacy Uddipok): required for a CQ, optional for MCQs.
  hasUddipok: boolean
  uddipok: Bilingual
  // Whether a generated set may reorder the items under the stimulus.
  shuffleItems: boolean
  items: QuestionItem[]
  status: QuestionStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type QuestionInput = Omit<Question, "id" | "status" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt">

export const emptyBilingual = (): Bilingual => ({ bn: "", en: "" })

export function blankItem(type: QuestionType, index = 0): QuestionItem {
  return {
    text: emptyBilingual(),
    options: type === "MCQ" ? MCQ_OPTIONS.slice(0, MCQ_MIN_OPTIONS).map(() => emptyBilingual()) : [],
    answer: "",
    solution: emptyBilingual(),
    marks: type === "CQ" ? [1, 2, 3, 4][index] ?? 1 : 1,
    shuffleOptions: type === "MCQ",
  }
}

// The marks a question carries: a CQ's sub-question marks; an MCQ item
// counts one question.
export const questionMarks = (q: Pick<Question, "type" | "items">) =>
  q.type === "CQ" ? q.items.reduce((sum, item) => sum + item.marks, 0) : q.items.length

// Whether an editor's HTML holds anything: text, an image or an equation.
export function hasContent(html: string) {
  if (/<img\b|data-latex=/i.test(html)) return true
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
}

// The plain text of editor HTML, for lists and searching.
export function plainText(html: string) {
  return html
    .replace(/<span[^>]*data-latex="([^"]*)"[^>]*><\/span>/g, " $1 ")
    .replace(/<div[^>]*data-latex="([^"]*)"[^>]*><\/div>/g, " $1 ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

// ---- Seed ----

const esc = (latex: string) => latex.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
// An inline equation as the editor saves it.
const m = (latex: string) => `<span data-type="inline-math" data-latex="${esc(latex)}"></span>`
const p = (html: string) => `<p>${html}</p>`
const both = (en: string, bn: string): Bilingual => ({ en: p(en), bn: p(bn) })
const same = (html: string): Bilingual => ({ en: p(html), bn: p(html) })

type SeedMcq = { chapter: number; en: string; bn: string; correct: string; wrong: string[]; solution?: string }

// Numbers near `v` to go with it as wrong options.
const near = (v: number, step = 1) => [v + step, v > step ? v - step : v + 3 * step, v + 2 * step].map(String)

const seedMcqs: SeedMcq[] = [
  // Real Numbers
  ...[12, 15, 17].map((n) => ({
    chapter: 1,
    en: `What is the value of ${m(`\\sqrt{${n * n}}`)}?`,
    bn: `${m(`\\sqrt{${n * n}}`)} এর মান কত?`,
    correct: String(n),
    wrong: near(n),
    solution: `${m(`\\sqrt{${n * n}} = ${n}`)}`,
  })),
  { chapter: 1, en: "Which of the following is an irrational number?", bn: "নিচের কোনটি অমূলদ সংখ্যা?", correct: "\\sqrt{2}", wrong: ["\\sqrt{4}", "0.5", "\\frac{3}{4}"] },
  { chapter: 1, en: `Which fraction is ${m("0.\\overline{3}")}?`, bn: `${m("0.\\overline{3}")} কে ভগ্নাংশে প্রকাশ করলে কোনটি হয়?`, correct: "\\frac{1}{3}", wrong: ["\\frac{3}{10}", "\\frac{1}{30}", "\\frac{3}{100}"] },
  { chapter: 1, en: "Which is the smallest prime number?", bn: "ক্ষুদ্রতম মৌলিক সংখ্যা কোনটি?", correct: "2", wrong: ["1", "3", "0"] },
  // Sets and Functions
  ...[3, 4, 5].map((n) => {
    const set = `\\{${Array.from({ length: n }, (_, i) => i + 1).join(", ")}\\}`
    return {
      chapter: 2,
      en: `How many subsets does ${m(`A = ${set}`)} have?`,
      bn: `${m(`A = ${set}`)} হলে A এর উপসেট কয়টি?`,
      correct: String(2 ** n),
      wrong: [String(2 ** n - 1), String(2 ** n + 2), String(2 ** (n - 1))],
      solution: m(`2^${n} = ${2 ** n}`),
    }
  }),
  ...[2, 3].map((n) => {
    const set = `\\{${["a", "b", "c"].slice(0, n).join(", ")}\\}`
    return {
      chapter: 2,
      en: `How many proper subsets does ${m(`B = ${set}`)} have?`,
      bn: `${m(`B = ${set}`)} হলে B এর প্রকৃত উপসেট কয়টি?`,
      correct: String(2 ** n - 1),
      wrong: [String(2 ** n), String(n), String(2 ** n + 1)],
    }
  }),
  { chapter: 2, en: `If ${m("f(x) = 2x + 1")}, what is ${m("f(3)")}?`, bn: `${m("f(x) = 2x + 1")} হলে ${m("f(3)")} এর মান কত?`, correct: "7", wrong: near(7) },
  // Algebraic Expressions
  ...[
    [5, 6],
    [7, 10],
    [6, 8],
  ].map(([s, q]) => ({
    chapter: 3,
    en: `If ${m(`a + b = ${s}`)} and ${m(`ab = ${q}`)}, what is ${m("a^2 + b^2")}?`,
    bn: `${m(`a + b = ${s}`)} এবং ${m(`ab = ${q}`)} হলে ${m("a^2 + b^2")} এর মান কত?`,
    correct: String(s * s - 2 * q),
    wrong: [String(s * s + 2 * q), String(s * s - q), String(s * s)],
    solution: m(`a^2 + b^2 = (a+b)^2 - 2ab = ${s * s} - ${2 * q} = ${s * s - 2 * q}`),
  })),
  ...[
    [3, 4],
    [2, 15],
  ].map(([d, q]) => ({
    chapter: 3,
    en: `If ${m(`a - b = ${d}`)} and ${m(`ab = ${q}`)}, what is ${m("a^2 + b^2")}?`,
    bn: `${m(`a - b = ${d}`)} এবং ${m(`ab = ${q}`)} হলে ${m("a^2 + b^2")} এর মান কত?`,
    correct: String(d * d + 2 * q),
    wrong: [String(d * d), String(d * d + q), String(d * d + 4 * q)],
  })),
  { chapter: 3, en: `What is the coefficient of ${m("x")} in ${m("(x + 2)(x + 3)")}?`, bn: `${m("(x + 2)(x + 3)")} এর বিস্তৃতিতে ${m("x")} এর সহগ কত?`, correct: "5", wrong: ["6", "1", "3"] },
  // Indices and Logarithms
  ...[
    [2, 8, 3],
    [3, 81, 4],
    [5, 125, 3],
  ].map(([base, value, answer]) => ({
    chapter: 4,
    en: `What is ${m(`\\log_{${base}} ${value}`)}?`,
    bn: `${m(`\\log_{${base}} ${value}`)} এর মান কত?`,
    correct: String(answer),
    wrong: near(answer),
  })),
  { chapter: 4, en: `What is ${m("2^3 \\times 2^2")}?`, bn: `${m("2^3 \\times 2^2")} এর মান কত?`, correct: "32", wrong: ["64", "12", "16"] },
  { chapter: 4, en: `What is ${m("27^{\\frac{1}{3}}")}?`, bn: `${m("27^{\\frac{1}{3}}")} এর মান কত?`, correct: "3", wrong: ["9", "\\frac{1}{3}", "81"] },
  { chapter: 4, en: `What is ${m("\\log_{10} 1000")}?`, bn: `${m("\\log_{10} 1000")} এর মান কত?`, correct: "3", wrong: ["2", "4", "10"] },
  // Linear Equations
  ...[
    [2, 3, 11],
    [3, 5, 20],
    [5, -4, 21],
    [4, 7, 31],
    [7, 2, 30],
    [6, -3, 33],
  ].map(([a, b, c]) => {
    const equation = `${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${c}`
    const x = (c - b) / a
    return {
      chapter: 5,
      en: `If ${m(equation)}, what is ${m("x")}?`,
      bn: `${m(equation)} হলে ${m("x")} এর মান কত?`,
      correct: String(x),
      wrong: near(x),
      solution: m(`${a}x = ${c - b} \\Rightarrow x = ${x}`),
    }
  }),
  // Geometry
  ...[5, 6, 8].map((n) => ({
    chapter: 6,
    en: `What is the sum of the interior angles of a polygon with ${n} sides?`,
    bn: `${n} বাহুবিশিষ্ট বহুভুজের অন্তঃস্থ কোণগুলোর সমষ্টি কত?`,
    correct: `${(n - 2) * 180}^\\circ`,
    wrong: near((n - 2) * 180, 180).map((v) => `${v}^\\circ`),
    solution: m(`(${n} - 2) \\times 180^\\circ = ${(n - 2) * 180}^\\circ`),
  })),
  ...[
    [50, 60],
    [45, 85],
  ].map(([x, y]) => ({
    chapter: 6,
    en: `Two angles of a triangle are ${m(`${x}^\\circ`)} and ${m(`${y}^\\circ`)}. What is the third angle?`,
    bn: `একটি ত্রিভুজের দুটি কোণ ${m(`${x}^\\circ`)} ও ${m(`${y}^\\circ`)} হলে তৃতীয় কোণটি কত?`,
    correct: `${180 - x - y}^\\circ`,
    wrong: near(180 - x - y, 10).map((v) => `${v}^\\circ`),
  })),
  { chapter: 6, en: "The legs of a right triangle are 3 cm and 4 cm. How long is the hypotenuse?", bn: "একটি সমকোণী ত্রিভুজের সমকোণ সংলগ্ন বাহু দুটি ৩ সেমি ও ৪ সেমি হলে অতিভুজ কত সেমি?", correct: "5", wrong: ["7", "6", "12"] },
]

const levelOf = (i: number) => questionLevels[i % questionLevels.length]
const seedUser = "Super Admin"
const seedStamp = "2026-09-01T09:00:00.000Z"

function seedQuestions(): Question[] {
  const base = {
    instituteId: 1,
    classId: 4,
    subjectId: 3,
    topicId: null,
    bangla: true,
    english: true,
    createdBy: seedUser,
    createdAt: seedStamp,
    modifiedBy: seedUser,
    modifiedAt: seedStamp,
  }
  const perChapter = new Map<number, number>()
  const mcqs: Question[] = seedMcqs.map((s, index) => {
    const n = perChapter.get(s.chapter) ?? 0
    perChapter.set(s.chapter, n + 1)
    // The correct option lands in a different place from question to question.
    const at = (index * 3 + s.chapter) % 4
    const options = [...s.wrong.slice(0, 3)]
    options.splice(at, 0, s.correct)
    return {
      ...base,
      id: index + 1,
      chapterId: s.chapter,
      topicId: s.chapter === 1 ? (n < 4 ? 7 : 8) : null,
      type: "MCQ",
      difficulty: 1 + ((index * 2 + s.chapter) % 5),
      level: levelOf(index),
      hasUddipok: false,
      uddipok: emptyBilingual(),
      shuffleItems: false,
      items: [
        {
          text: both(s.en, s.bn),
          options: options.map((o) => same(m(o))),
          answer: MCQ_OPTIONS[at],
          solution: s.solution ? same(s.solution) : emptyBilingual(),
          marks: 1,
          shuffleOptions: true,
        },
      ],
      // The last of the first and last chapters still wait for review.
      status: index === 5 || index === seedMcqs.length - 1 ? "Draft" : "Approved",
    }
  })

  // An MCQ stimulus with two questions under it.
  const group: Question = {
    ...base,
    id: mcqs.length + 1,
    chapterId: 6,
    type: "MCQ",
    difficulty: 3,
    level: "Application",
    hasUddipok: true,
    uddipok: both(
      `In triangle ABC, ${m("\\angle A = 90^\\circ")}, ${m("AB = 6")} cm and ${m("AC = 8")} cm. Answer the next two questions from this information.`,
      `ABC ত্রিভুজে ${m("\\angle A = 90^\\circ")}, ${m("AB = 6")} সেমি এবং ${m("AC = 8")} সেমি। এই তথ্যের আলোকে পরের দুটি প্রশ্নের উত্তর দাও।`
    ),
    shuffleItems: true,
    items: [
      { text: both("How long is BC?", "BC এর দৈর্ঘ্য কত সেমি?"), options: ["10", "14", "12", "7"].map((o) => same(m(o))), answer: "A", solution: same(m("BC = \\sqrt{6^2 + 8^2} = 10")), marks: 1, shuffleOptions: true },
      { text: both("What is the area of the triangle?", "ত্রিভুজটির ক্ষেত্রফল কত বর্গসেমি?"), options: ["48", "14", "24", "30"].map((o) => same(m(o))), answer: "C", solution: same(m("\\frac{1}{2} \\times 6 \\times 8 = 24")), marks: 1, shuffleOptions: true },
    ],
    status: "Approved",
  }

  const cq = (
    id: number,
    chapterId: number,
    difficulty: number,
    level: QuestionLevel,
    uddipok: Bilingual,
    parts: [Bilingual, number][]
  ): Question => ({
    ...base,
    id,
    chapterId,
    type: "CQ",
    difficulty,
    level,
    hasUddipok: true,
    uddipok,
    shuffleItems: false,
    items: parts.map(([text, marks]) => ({
      text,
      options: [],
      answer: "",
      solution: emptyBilingual(),
      marks,
      shuffleOptions: false,
    })),
    status: "Approved",
  })

  let id = group.id
  const cqs: Question[] = [
    cq(++id, 3, 3, "Application", both(`${m("a + b = 7")} and ${m("ab = 12")}.`, `${m("a + b = 7")} এবং ${m("ab = 12")}।`), [
      [both(`Find ${m("a^2 + b^2")}.`, `${m("a^2 + b^2")} এর মান নির্ণয় কর।`), 2],
      [both(`Find ${m("a^3 + b^3")}.`, `${m("a^3 + b^3")} এর মান নির্ণয় কর।`), 4],
      [both(`Show that ${m("(a - b)^2 = 1")}, and find a and b.`, `দেখাও যে, ${m("(a - b)^2 = 1")} এবং a ও b এর মান নির্ণয় কর।`), 4],
    ]),
    cq(++id, 5, 2, "Application", both("The sum of two numbers is 25 and their difference is 5.", "দুটি সংখ্যার যোগফল ২৫ এবং বিয়োগফল ৫।"), [
      [both("Write the information as two equations.", "তথ্যগুলোকে দুটি সমীকরণের মাধ্যমে প্রকাশ কর।"), 2],
      [both("Solve the equations to find the numbers.", "সমীকরণ দুটি সমাধান করে সংখ্যা দুটি নির্ণয় কর।"), 4],
      [both("Find the ratio of the squares of the numbers.", "সংখ্যা দুটির বর্গের অনুপাত নির্ণয় কর।"), 4],
    ]),
    cq(++id, 4, 4, "Higher", both(`${m("p = \\log_2 32")} and ${m("q = \\log_3 27")}.`, `${m("p = \\log_2 32")} এবং ${m("q = \\log_3 27")}।`), [
      [both("Find p and q.", "p ও q এর মান নির্ণয় কর।"), 2],
      [both(`Show that ${m("2^p \\cdot 3^q = 864")}.`, `দেখাও যে, ${m("2^p \\cdot 3^q = 864")}।`), 4],
      [both(`Find ${m("\\log_6 \\left(\\frac{2^p \\cdot 3^q}{4}\\right)")}.`, `${m("\\log_6 \\left(\\frac{2^p \\cdot 3^q}{4}\\right)")} এর মান নির্ণয় কর।`), 4],
    ]),
    cq(
      ++id,
      2,
      3,
      "Comprehension",
      both(
        `${m("U = \\{1, 2, \\ldots, 10\\}")}, A is the set of even numbers in U and B the set of multiples of 3 in U.`,
        `${m("U = \\{1, 2, \\ldots, 10\\}")}, A হলো U এর জোড় সংখ্যার সেট এবং B হলো U এর ৩ এর গুণিতকের সেট।`
      ),
      [
        [both("Write A and B in roster form.", "A ও B কে তালিকা পদ্ধতিতে লেখ।"), 2],
        [both(`Find ${m("A \\cup B")} and ${m("A \\cap B")}.`, `${m("A \\cup B")} ও ${m("A \\cap B")} নির্ণয় কর।`), 4],
        [both(`Verify that ${m("(A \\cup B)' = A' \\cap B'")}.`, `যাচাই কর যে, ${m("(A \\cup B)' = A' \\cap B'")}।`), 4],
      ]
    ),
    cq(++id, 6, 2, "Knowledge", both(`The interior angles of a polygon add up to ${m("1080^\\circ")}.`, `একটি বহুভুজের অন্তঃস্থ কোণগুলোর সমষ্টি ${m("1080^\\circ")}।`), [
      [both("Find the number of its sides.", "বহুভুজটির বাহুর সংখ্যা নির্ণয় কর।"), 2],
      [both("If it is regular, find each interior angle.", "বহুভুজটি সুষম হলে এর প্রতিটি অন্তঃস্থ কোণ নির্ণয় কর।"), 4],
      [both("Find the number of its diagonals.", "বহুভুজটির কর্ণের সংখ্যা নির্ণয় কর।"), 4],
    ]),
    cq(++id, 6, 3, "Application", both(`In triangle ABC, ${m("\\angle B = 90^\\circ")}, ${m("AB = 5")} cm and ${m("BC = 12")} cm.`, `ABC ত্রিভুজে ${m("\\angle B = 90^\\circ")}, ${m("AB = 5")} সেমি এবং ${m("BC = 12")} সেমি।`), [
      [both("Find AC.", "AC এর দৈর্ঘ্য নির্ণয় কর।"), 2],
      [both("Find the area and the perimeter of the triangle.", "ত্রিভুজটির ক্ষেত্রফল ও পরিসীমা নির্ণয় কর।"), 4],
      [both("Find the altitude drawn on AC.", "AC এর উপর অঙ্কিত লম্বের দৈর্ঘ্য নির্ণয় কর।"), 4],
    ]),
    cq(++id, 1, 3, "Comprehension", both(`${m("x = 0.\\overline{27}")}.`, `${m("x = 0.\\overline{27}")}।`), [
      [both("Express x as a fraction.", "x কে ভগ্নাংশে প্রকাশ কর।"), 2],
      [both(`Prove that ${m("\\sqrt{2}")} is irrational.`, `প্রমাণ কর যে, ${m("\\sqrt{2}")} একটি অমূলদ সংখ্যা।`), 4],
      [both(`Find ${m("x + 0.\\overline{72}")}.`, `${m("x + 0.\\overline{72}")} এর মান নির্ণয় কর।`), 4],
    ]),
    cq(++id, 3, 4, "Higher", both(`${m("f(x) = x^2 - 5x + 6")}.`, `${m("f(x) = x^2 - 5x + 6")}।`), [
      [both(`Find ${m("f(2)")}.`, `${m("f(2)")} এর মান নির্ণয় কর।`), 2],
      [both(`Factorise ${m("f(x)")}.`, `${m("f(x)")} কে উৎপাদকে বিশ্লেষণ কর।`), 4],
      [both(`Solve ${m("f(x) = 0")} and find the sum of its roots.`, `${m("f(x) = 0")} সমাধান কর এবং মূলদ্বয়ের যোগফল নির্ণয় কর।`), 4],
    ]),
  ]

  return [...mcqs, group, ...cqs]
}

const seed = seedQuestions()
let questions: Question[] = seed
const listeners = new Set<() => void>()

function emit(next: Question[]) {
  logChanges("Question", questions, next)
  questions = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useQuestions() {
  return React.useSyncExternalStore(subscribe, () => questions, () => seed)
}

export function useQuestion(id: number) {
  return useQuestions().find((q) => q.id === id)
}

export function getQuestions() {
  return questions
}

// ---- Validation ----

export type QuestionErrors = Record<string, string | undefined>

const languagesOf = (q: Pick<Question, "bangla" | "english">) =>
  [q.bangla && ("bn" as const), q.english && ("en" as const)].filter(Boolean) as ("bn" | "en")[]

const languageName = { bn: "Bangla", en: "English" }

// Keys: form field names, or "items.<i>.<field>" for an item's fields.
export function questionErrors(input: QuestionInput): QuestionErrors {
  const errors: QuestionErrors = {}
  if (!input.instituteId) errors.instituteId = "Select an institute."
  if (!input.classId) errors.classId = "Select a class."
  if (!input.subjectId) errors.subjectId = "Select a subject."
  if (!input.chapterId) errors.chapterId = "Select a chapter."
  const languages = languagesOf(input)
  if (!languages.length) errors.languages = "Write the question in Bangla, English or both."
  if (input.type === "CQ" && !input.hasUddipok) errors.hasUddipok = "A CQ needs its stimulus."
  if (input.hasUddipok) {
    const missing = languages.find((l) => !hasContent(input.uddipok[l]))
    if (missing) errors.uddipok = `Write the stimulus in ${languageName[missing]}.`
  }
  const max = input.type === "CQ" ? MAX_CQ_ITEMS : input.hasUddipok ? MAX_MCQ_GROUP : 1
  if (!input.items.length) errors.items = "Add a question."
  else if (input.items.length > max) errors.items = `At most ${max} ${input.type === "CQ" ? "sub-questions" : "questions"}.`
  input.items.forEach((item, i) => {
    const key = (field: string) => `items.${i}.${field}`
    const missing = languages.find((l) => !hasContent(item.text[l]))
    if (missing) errors[key("text")] = `Write the question in ${languageName[missing]}.`
    if (input.type === "MCQ") {
      if (item.options.length < MCQ_MIN_OPTIONS || item.options.length > MCQ_OPTIONS.length) errors[key("answer")] = "An MCQ has 4 or 5 options."
      item.options.forEach((option, o) => {
        const blank = languages.find((l) => !hasContent(option[l]))
        if (blank) errors[key(`option.${o}`)] = `Option ${MCQ_OPTIONS[o]} is blank in ${languageName[blank]}.`
      })
      if (!MCQ_OPTIONS.slice(0, item.options.length).includes(item.answer as (typeof MCQ_OPTIONS)[number]))
        errors[key("answer")] = "Pick the correct option."
    } else if (!(item.marks > 0)) {
      errors[key("marks")] = "Marks must be more than 0."
    }
  })
  return errors
}

function clean(input: QuestionInput): QuestionInput {
  const keep = (b: Bilingual): Bilingual => ({ bn: input.bangla ? b.bn : "", en: input.english ? b.en : "" })
  return {
    ...input,
    topicId: input.topicId || null,
    uddipok: input.hasUddipok ? keep(input.uddipok) : emptyBilingual(),
    shuffleItems: input.hasUddipok && input.items.length > 1 ? input.shuffleItems : false,
    items: input.items.map((item) => ({
      ...item,
      text: keep(item.text),
      options: input.type === "MCQ" ? item.options.map(keep) : [],
      answer: input.type === "MCQ" ? item.answer : "",
      solution: keep(item.solution),
      marks: input.type === "MCQ" ? 1 : item.marks,
      shuffleOptions: input.type === "MCQ" && item.shuffleOptions,
    })),
  }
}

// ---- Changes ----

const now = () => new Date().toISOString()

export function addQuestion(input: QuestionInput, user: string, status: QuestionStatus = "Draft") {
  const first = Object.values(questionErrors(input)).find(Boolean)
  if (first) throw new Error(first)
  const stamp = now()
  const question: Question = {
    ...clean(input),
    id: Math.max(0, ...questions.map((q) => q.id)) + 1,
    status,
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...questions, question])
  return question
}

function patch(id: number, changes: Partial<Question>, user: string) {
  emit(questions.map((q) => (q.id === id ? { ...q, ...changes, modifiedBy: user, modifiedAt: now() } : q)))
}

// Generated papers keep their own copy of a question, so editing an
// approved one doesn't change a paper already made.
export function updateQuestion(id: number, input: QuestionInput, user: string) {
  const first = Object.values(questionErrors(input)).find(Boolean)
  if (first) throw new Error(first)
  patch(id, clean(input), user)
}

// Draft ⇄ Approved ⇄ Retired (legacy StatusUpdate / IsVerify).
export function setQuestionStatus(id: number, status: Exclude<QuestionStatus, "Deleted">, user: string) {
  const question = questions.find((q) => q.id === id)
  if (!question || question.status === "Deleted" || question.status === status) return
  patch(id, { status }, user)
}

export function deleteQuestion(id: number, user: string) {
  const question = questions.find((q) => q.id === id)
  if (!question || question.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

// Back as a draft, to be reviewed again.
export function retrieveQuestion(id: number, user: string) {
  const question = questions.find((q) => q.id === id)
  if (!question || question.status !== "Deleted") return
  patch(id, { status: "Draft" }, user)
}

export function deleteQuestionPermanently(id: number) {
  emit(questions.filter((q) => q.id !== id))
}

export function removeInstituteQuestions(instituteId: number) {
  emit(questions.filter((q) => q.instituteId !== instituteId))
}

// Why a chapter or topic can't be deleted yet: questions filed under it, or
// (for a chapter) topics still in it.
export function chapterInUse(chapter: Pick<QuestionChapter, "id" | "instituteId">) {
  const used = questions.filter(
    (q) => q.status !== "Deleted" && (q.chapterId === chapter.id || q.topicId === chapter.id)
  ).length
  if (used) return `${used} question${used === 1 ? " is" : "s are"} filed under it.`
  const topics = questionChapterStore.getList(chapter.instituteId).filter((c) => c.parentId === chapter.id).length
  if (topics) return `It still has ${topics} topic${topics === 1 ? "" : "s"}.`
  return undefined
}
