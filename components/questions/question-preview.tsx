"use client"

import { QuestionContent } from "@/components/questions/question-content"
import { cqLabels, optionLabels, paperNumber } from "@/lib/bangla"
import { hasContent, MCQ_OPTIONS, type Question } from "@/lib/question-bank"
import { cn } from "@/lib/utils"

// A bank question as a reader sees it in one language: the stimulus, then
// each item with its options (the correct one marked) or its sub-questions
// with their marks, and the solutions when asked for.
export function QuestionPreview({
  question,
  lang,
  showAnswer = true,
  showSolution = false,
  className,
}: {
  question: Question
  lang: "bn" | "en"
  showAnswer?: boolean
  showSolution?: boolean
  className?: string
}) {
  const bangla = lang === "bn"
  return (
    <div className={cn("flex flex-col gap-3 text-sm", className)} lang={lang}>
      {question.hasUddipok && hasContent(question.uddipok[lang]) && (
        <div className="rounded-md border-l-4 border-primary/40 bg-muted/40 px-3 py-2">
          <QuestionContent html={question.uddipok[lang]} />
        </div>
      )}
      {question.items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <span className="shrink-0 font-medium tabular-nums">
              {question.type === "CQ" ? `${cqLabels[lang][i]}.` : question.items.length > 1 ? `${paperNumber(i + 1, bangla)}.` : ""}
            </span>
            <QuestionContent html={item.text[lang]} className="min-w-0 flex-1" />
            {question.type === "CQ" && (
              <span className="shrink-0 text-muted-foreground tabular-nums">{paperNumber(item.marks, bangla)}</span>
            )}
          </div>
          {question.type === "MCQ" && (
            <div className="grid gap-x-6 gap-y-1 pl-5 sm:grid-cols-2">
              {item.options.map((option, o) => {
                const correct = showAnswer && item.answer === MCQ_OPTIONS[o]
                return (
                  <div
                    key={o}
                    className={cn(
                      "flex items-baseline gap-1.5 rounded px-1",
                      correct && "bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    <span className="shrink-0">({optionLabels[lang][o]})</span>
                    <QuestionContent html={option[lang]} inline />
                  </div>
                )
              })}
            </div>
          )}
          {showSolution && hasContent(item.solution[lang]) && (
            <div className="ml-5 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
              <span className="font-medium">{bangla ? "সমাধান: " : "Solution: "}</span>
              <QuestionContent html={item.solution[lang]} inline />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
