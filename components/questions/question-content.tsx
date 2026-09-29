"use client"

import * as React from "react"
import DOMPurify from "dompurify"
import katex from "katex"
import "katex/dist/katex.min.css"

import { cn } from "@/lib/utils"

// Typography for question HTML, shared by the editor, the bank's pages and
// the printed paper so a question looks the same everywhere. Tighter than a
// blog post: questions are short and printed densely.
export const questionTextClass = cn(
  "break-words leading-relaxed",
  "[&_p]:my-0.5 [&_p:empty]:hidden [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_img]:my-1 [&_img]:inline-block [&_img]:h-auto [&_img]:max-h-48 [&_img]:max-w-full",
  "[&_table]:my-1 [&_table]:border-collapse [&_td]:border [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:px-1.5 [&_th]:py-0.5 [&_td_p]:my-0 [&_th_p]:my-0",
  "[&_[data-type=block-math]]:my-1 [&_[data-type=block-math]]:text-center"
)

// Options and short answers sit on one line with their label.
const inlineClass = "[&_p]:inline [&_p]:my-0"

const KATEX_OPTIONS = { throwOnError: false, strict: false } as const

export function renderLatex(latex: string, displayMode = false) {
  return katex.renderToString(latex, { ...KATEX_OPTIONS, displayMode })
}

// Sanitises question HTML (no script, handlers or embeds) and typesets its
// equations. The editor saves an equation as an empty span / div carrying
// its LaTeX in data-latex; KaTeX's output is added after sanitising.
export function renderQuestionHtml(html: string) {
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  const doc = new DOMParser().parseFromString(safe, "text/html")
  doc.querySelectorAll("[data-type=inline-math], [data-type=block-math]").forEach((el) => {
    el.innerHTML = renderLatex(el.getAttribute("data-latex") ?? "", el.getAttribute("data-type") === "block-math")
  })
  return doc.body.innerHTML
}

const noop = () => () => {}

export function QuestionContent({
  html,
  inline,
  className,
  style,
}: {
  html: string
  inline?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  // DOMPurify and DOMParser need the browser; the server renders it empty.
  const client = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const rendered = React.useMemo(() => (client ? renderQuestionHtml(html) : ""), [client, html])
  const Tag = inline ? "span" : "div"
  return (
    <Tag
      className={cn(questionTextClass, inline && inlineClass, className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}
