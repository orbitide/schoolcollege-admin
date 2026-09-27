"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { SidebarInput } from "@/components/ui/sidebar"

type Match = { score: number; indices: number[] }

// A character that starts a word ("Student" in "Manage Students").
function isWordStart(text: string, index: number) {
  if (index === 0) return true
  const prev = text[index - 1]
  return !/[\p{L}\p{N}]/u.test(prev) || (/\p{Ll}/u.test(prev) && /\p{Lu}/u.test(text[index]))
}

// Subsequence (LCS) match of the query in a menu label, ignoring case and
// spaces in the query: it matches when the label's longest common
// subsequence with the query is the whole query, so "mst" finds
// "Manage Students". Of the ways the letters can line up, the best scoring
// one is kept: letters that are consecutive or start a word score higher,
// so the closest labels rank first. null when it doesn't match.
export function fuzzyMatch(text: string, query: string): Match | null {
  const q = query.toLowerCase().replace(/\s+/g, "")
  if (!q) return { score: 0, indices: [] }
  const t = text.toLowerCase()
  const m = q.length
  const n = t.length
  if (m > n) return null

  const charScore = (j: number) => 1 + (isWordStart(text, j) ? 2 : 0) + (j === 0 ? 1 : 0)
  // best[i][j]: top score with query[i] matched at text[j]; from[i][j] is
  // where query[i - 1] was matched on that path.
  const best: number[][] = []
  const from: number[][] = []
  for (let i = 0; i < m; i++) {
    best.push(new Array<number>(n).fill(-Infinity))
    from.push(new Array<number>(n).fill(-1))
    for (let j = i; j < n; j++) {
      if (t[j] !== q[i]) continue
      if (i === 0) {
        best[i][j] = charScore(j)
        continue
      }
      for (let k = i - 1; k < j; k++) {
        if (best[i - 1][k] === -Infinity) continue
        // Consecutive letters earn a bonus; a gap costs a little per skip.
        const link = k === j - 1 ? 3 : -0.05 * (j - k - 1)
        const score = best[i - 1][k] + link + charScore(j)
        if (score > best[i][j]) {
          best[i][j] = score
          from[i][j] = k
        }
      }
    }
  }

  let end = -1
  for (let j = 0; j < n; j++) {
    if (best[m - 1][j] > (end < 0 ? -Infinity : best[m - 1][end])) end = j
  }
  if (end < 0) return null
  const indices: number[] = []
  for (let i = m - 1, j = end; i >= 0; j = from[i][j], i--) indices.unshift(j)
  // Shorter labels win ties: "Students" before "Student Transfer".
  return { score: best[m - 1][end] - n * 0.01, indices }
}

// Does this menu label match the query? Shared by every sidebar group.
export function matchesQuery(text: string, query: string) {
  return fuzzyMatch(text, query) !== null
}

// How well a label matches; -Infinity when it doesn't.
export function matchScore(text: string, query: string) {
  return fuzzyMatch(text, query)?.score ?? -Infinity
}

// Best matches first; keeps menu order while not searching.
export function rankByQuery<T>(items: T[], label: (item: T) => string, query: string) {
  if (!query.trim()) return items
  return items
    .map((item, index) => ({ item, index, score: matchScore(label(item), query) }))
    .filter((entry) => entry.score > -Infinity)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item)
}

// The label with the matched letters marked, so results are easy to spot.
export function Highlight({ text, query }: { text: string; query: string }) {
  const match = query.trim() ? fuzzyMatch(text, query) : null
  if (!match?.indices.length) return <>{text}</>

  // Mark runs of consecutive matched letters together.
  const matched = new Set(match.indices)
  const parts: { text: string; mark: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const mark = matched.has(i)
    const last = parts[parts.length - 1]
    if (last && last.mark === mark) last.text += text[i]
    else parts.push({ text: text[i], mark })
  }
  return (
    <>
      {parts.map((part, index) =>
        part.mark ? (
          <mark
            key={index}
            className="rounded-sm bg-amber-300/60 text-inherit dark:bg-amber-400/30"
          >
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        )
      )}
    </>
  )
}

// Search box at the top of the sidebar. Ctrl/⌘+K or "/" focuses it, Escape
// clears it, and Enter opens the first matching link.
export function NavSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
      <SidebarInput
        ref={inputRef}
        type="search"
        value={value}
        placeholder="Search menu..."
        aria-label="Search menu"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("")
          } else if (event.key === "Enter") {
            // The first visible menu link is the best match.
            const first = event.currentTarget
              .closest("[data-sidebar=sidebar]")
              ?.querySelector<HTMLAnchorElement>("[data-sidebar=content] a[href]")
            if (first) {
              first.click()
              onChange("")
              event.currentTarget.blur()
            }
          }
        }}
        className="h-9 rounded-lg border-sidebar-border bg-background/70 pr-12 pl-8 transition-shadow focus-visible:bg-background [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("")
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <XIcon className="size-3.5" />
          <span className="sr-only">Clear search</span>
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/60">
          Ctrl K
        </kbd>
      )}
    </div>
  )
}
