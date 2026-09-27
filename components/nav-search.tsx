"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { SidebarInput } from "@/components/ui/sidebar"

// Case-insensitive "does this menu label contain the query" check shared by
// every sidebar group.
export function matchesQuery(text: string, query: string) {
  const q = query.trim().toLowerCase()
  return q === "" || text.toLowerCase().includes(q)
}

// The label with the matched part marked, so results are easy to spot.
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-400/30">
        {text.slice(at, at + q.length)}
      </mark>
      {text.slice(at + q.length)}
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
