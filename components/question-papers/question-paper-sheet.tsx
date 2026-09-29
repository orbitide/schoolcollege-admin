"use client"

import * as React from "react"

import { QuestionContent } from "@/components/questions/question-content"
import { cqLabels, optionLabels, paperNumber } from "@/lib/bangla"
import type { Institute, Subject } from "@/lib/institutes"
import { hasContent } from "@/lib/question-bank"
import {
  lineAnswer,
  paperLines,
  SET_CODES,
  type GeneratedPaper,
  type PaperLine,
  type PaperSet,
} from "@/lib/question-papers"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

export type PaperLang = "bn" | "en"

export type PaperLook = {
  lang: PaperLang
  fontSize: number
  columns: 1 | 2
  showAnswer: boolean
  showSolution: boolean
}

// The printed paper's margins; the sheet is drawn at the page's width
// less these, so the preview's height tells how many pages it takes.
export const PAPER_MARGIN_MM = 12
export const PAPER_CONTENT_MM = { width: 210 - 2 * PAPER_MARGIN_MM, height: 297 - 2 * PAPER_MARGIN_MM }

const words = {
  bn: {
    set: "সেট",
    time: "সময়",
    fullMarks: "পূর্ণমান",
    hours: "ঘণ্টা",
    minutes: "মিনিট",
    subjectCode: "বিষয় কোড",
    mcqNote: (per: number) =>
      `[বিশেষ দ্রষ্টব্য: সরবরাহকৃত বহুনির্বাচনি অভীক্ষার উত্তরপত্রে প্রশ্নের ক্রমিক নম্বরের বিপরীতে প্রদত্ত বর্ণসংবলিত বৃত্তসমূহ হতে সঠিক উত্তরের বৃত্তটি বল পয়েন্ট কলম দ্বারা সম্পূর্ণ ভরাট কর। প্রতিটি প্রশ্নের মান ${paperNumber(per, true)}। প্রশ্নপত্রে কোনো প্রকার দাগ/চিহ্ন দেয়া যাবে না।]`,
    cqNote: (n: number) => `[দ্রষ্টব্য: ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান জ্ঞাপক। যেকোনো ${paperNumber(n, true)}টি প্রশ্নের উত্তর দাও।]`,
    group: (a: number, b: number) =>
      a === b
        ? `নিচের তথ্যের আলোকে ${paperNumber(a, true)} নং প্রশ্নের উত্তর দাও:`
        : `নিচের তথ্যের আলোকে ${paperNumber(a, true)} ও ${paperNumber(b, true)} নং প্রশ্নের উত্তর দাও:`,
    solution: "সমাধান",
    answerKey: "উত্তরমালা",
  },
  en: {
    set: "Set",
    time: "Time",
    fullMarks: "Full marks",
    hours: "hours",
    minutes: "minutes",
    subjectCode: "Subject code",
    mcqNote: (per: number) =>
      `[N.B. Fill in the circle of the correct answer against each question number on the OMR answer sheet with a ballpoint pen. Each question carries ${per} mark${per === 1 ? "" : "s"}. Do not mark the question paper.]`,
    cqNote: (n: number) => `[N.B. The figures in the right margin indicate full marks. Answer any ${n} questions.]`,
    group: (a: number, b: number) =>
      a === b ? `Read the following and answer question ${a}:` : `Read the following and answer questions ${a}–${b}:`,
    solution: "Solution",
    answerKey: "Answer key",
  },
}

export function paperDuration(minutes: number, lang: PaperLang) {
  const w = words[lang]
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const n = (v: number) => paperNumber(v, lang === "bn")
  return [hours && `${n(hours)} ${w.hours}`, rest && `${n(rest)} ${w.minutes}`].filter(Boolean).join(" ") || `${n(0)} ${w.minutes}`
}

// The set code as the paper prints it (ক–ঘ on a Bangla paper).
export const setLabel = (setCode: string, lang: PaperLang) => {
  const i = SET_CODES.indexOf(setCode as (typeof SET_CODES)[number])
  return i >= 0 ? optionLabels[lang][i] : setCode
}

function PaperHeader({
  paper,
  set,
  exam,
  subject,
  institute,
  lang,
  title,
}: {
  paper: GeneratedPaper
  set?: PaperSet
  exam: TermExam
  subject?: Subject
  institute?: Institute
  lang: PaperLang
  title?: string
}) {
  const w = words[lang]
  const bangla = lang === "bn"
  const subjectMarks = exam.subjects.find((s) => s.subjectId === paper.subjectId)
  const marks = paper.type === "MCQ" ? subjectMarks?.mcqMarks : subjectMarks?.cqMarks
  return (
    <header className="mb-3 border-b border-black pb-2 text-center">
      <div className="text-[1.35em] font-bold leading-tight">{institute?.name}</div>
      <div className="text-[1.05em] font-semibold">{exam.fullName}</div>
      <div className="font-semibold">
        {(bangla && subject?.nameBn) || subject?.name}
        {subject?.code && (
          <span className="font-normal">
            {" "}
            · {w.subjectCode}: {subject.code}
          </span>
        )}
        {" · "}
        {paper.type === "MCQ" ? (bangla ? "বহুনির্বাচনি অভীক্ষা" : "Multiple Choice") : bangla ? "সৃজনশীল প্রশ্ন" : "Creative Questions"}
      </div>
      {title && <div className="font-semibold">{title}</div>}
      <div className="mt-1 flex items-center justify-between text-[0.95em]">
        <span>
          {w.time}: {paperDuration(paper.settings.durationMinutes, lang)}
        </span>
        {set && paper.settings.totalSets > 1 && (
          <span className="rounded border border-black px-2 font-bold">
            {w.set}: {setLabel(set.setCode, lang)}
          </span>
        )}
        <span>
          {w.fullMarks}: {paperNumber(marks ?? 0, bangla)}
        </span>
      </div>
    </header>
  )
}

function McqLine({ line, look }: { line: PaperLine; look: PaperLook }) {
  const { lang } = look
  const bangla = lang === "bn"
  const item = line.question.items[line.itemIndex]
  const answer = lineAnswer(line)
  const short = item.options.every((o) => o[lang].replace(/<[^>]*>/g, "").length < 28 && !/<img/i.test(o[lang]))
  return (
    <div className="break-inside-avoid py-[0.2em]">
      <div className="flex gap-[0.4em]">
        <span className="shrink-0 font-semibold tabular-nums">{paperNumber(line.serial, bangla)}.</span>
        <QuestionContent html={item.text[lang]} className="min-w-0 flex-1" />
      </div>
      <div className={cn("grid gap-x-[1em] pl-[1.6em]", short ? (item.options.length > 4 ? "grid-cols-5" : "grid-cols-4") : "grid-cols-2")}>
        {line.optionOrder.map((original, at) => (
          <div
            key={at}
            className={cn("flex items-baseline gap-[0.3em]", look.showAnswer && optionLabels.en[at] === answer && "font-bold underline")}
          >
            <span className="shrink-0">({optionLabels[lang][at]})</span>
            <QuestionContent html={item.options[original]?.[lang] ?? ""} inline />
          </div>
        ))}
      </div>
      {look.showSolution && hasContent(item.solution[lang]) && (
        <div className="pl-[1.6em] text-[0.9em] italic">
          {words[lang].solution}: <QuestionContent html={item.solution[lang]} inline />
        </div>
      )}
    </div>
  )
}

function CqLine({ line, look }: { line: PaperLine; look: PaperLook }) {
  const { lang } = look
  const bangla = lang === "bn"
  const q = line.question
  return (
    <div className="break-inside-avoid py-[0.35em]">
      <div className="flex gap-[0.4em]">
        <span className="shrink-0 font-semibold tabular-nums">{paperNumber(line.serial, bangla)}.</span>
        <QuestionContent html={q.uddipok[lang]} className="min-w-0 flex-1" />
      </div>
      <div className="flex flex-col pl-[1.6em]">
        {q.items.map((item, i) => (
          <div key={i}>
            <div className="flex gap-[0.4em]">
              <span className="shrink-0">{cqLabels[lang][i]}.</span>
              <QuestionContent html={item.text[lang]} className="min-w-0 flex-1" />
              <span className="shrink-0 pl-[0.5em] tabular-nums">{paperNumber(item.marks, bangla)}</span>
            </div>
            {look.showSolution && hasContent(item.solution[lang]) && (
              <div className="pl-[1.2em] text-[0.9em] italic">
                {words[lang].solution}: <QuestionContent html={item.solution[lang]} inline />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// One set of a generated paper as it prints: the header, the instructions,
// then the questions in the set's order (an MCQ stimulus before the
// questions it covers), in one or two columns.
export function QuestionPaperSheet({
  paper,
  set,
  exam,
  subject,
  institute,
  look,
  className,
}: {
  paper: GeneratedPaper
  set: PaperSet
  exam: TermExam
  subject?: Subject
  institute?: Institute
  look: PaperLook
  className?: string
}) {
  const { lang } = look
  const w = words[lang]
  const lines = paperLines(paper, set)
  return (
    <div
      lang={lang}
      className={cn("bg-white text-black", className)}
      style={{ width: `${PAPER_CONTENT_MM.width}mm`, fontSize: `${look.fontSize}pt`, lineHeight: 1.4 }}
    >
      <PaperHeader paper={paper} set={set} exam={exam} subject={subject} institute={institute} lang={lang} />
      <p className="mb-2 text-[0.9em]">
        {paper.type === "MCQ" ? w.mcqNote(paper.settings.mcqMarksPerQuestion) : w.cqNote(paper.settings.cqAnswerCount)}
      </p>
      <div
        className={cn(look.columns === 2 && "[column-rule:1px_solid_#999]")}
        style={{ columnCount: look.columns, columnGap: "8mm" }}
      >
        {lines.map((line) =>
          paper.type === "CQ" ? (
            <CqLine key={line.serial} line={line} look={look} />
          ) : (
            <React.Fragment key={line.serial}>
              {line.startsGroup && line.question.hasUddipok && (
                <div className="break-inside-avoid pt-[0.3em]">
                  <div className="font-semibold">{w.group(line.groupRange[0], line.groupRange[1])}</div>
                  <QuestionContent html={line.question.uddipok[lang]} className="border-l-2 border-black/40 pl-[0.5em]" />
                </div>
              )}
              <McqLine line={line} look={look} />
            </React.Fragment>
          )
        )}
      </div>
    </div>
  )
}

// Every set's MCQ answers on one sheet (legacy correct answer sheet), for
// the examiners.
export function AnswerKeySheet({
  paper,
  exam,
  subject,
  institute,
  lang,
}: {
  paper: GeneratedPaper
  exam: TermExam
  subject?: Subject
  institute?: Institute
  lang: PaperLang
}) {
  const bangla = lang === "bn"
  return (
    <div lang={lang} className="bg-white text-black" style={{ width: `${PAPER_CONTENT_MM.width}mm`, fontSize: "10pt" }}>
      <PaperHeader paper={paper} exam={exam} subject={subject} institute={institute} lang={lang} title={words[lang].answerKey} />
      <div className="flex flex-col gap-4">
        {paper.sets.map((set) => {
          const lines = paperLines(paper, set)
          return (
            <section key={set.setCode} className="break-inside-avoid">
              <h3 className="mb-1 font-bold">
                {words[lang].set}: {setLabel(set.setCode, lang)}
              </h3>
              <div className="grid grid-cols-10 border-t border-l border-black">
                {lines.map((line) => {
                  const answer = lineAnswer(line)
                  const at = optionLabels.en.indexOf(answer as "A")
                  return (
                    <div key={line.serial} className="flex justify-between border-r border-b border-black px-1.5 py-0.5 tabular-nums">
                      <span>{paperNumber(line.serial, bangla)}.</span>
                      <span className="font-bold">{at >= 0 ? optionLabels[lang][at] : "—"}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
