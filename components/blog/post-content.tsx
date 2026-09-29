"use client"

import * as React from "react"
import DOMPurify from "dompurify"

import { cn } from "@/lib/utils"

// Typography for post HTML, shared by the editor and the reader so a post
// looks the same in both.
export const richTextClass = cn(
  "text-sm leading-relaxed break-words",
  "[&_p]:my-2 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:font-mono",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
  "[&_hr]:my-4 [&>*:first-child]:mt-0"
)

const noop = () => () => {}

// Post HTML as a reader sees it, sanitised: legacy showed it raw
// (Html.Raw), which let any author run script on the site. Links open in a
// new tab.
export function PostContent({ html, className }: { html: string; className?: string }) {
  // DOMPurify needs the browser's DOM; the server (and hydration) render
  // the box empty.
  const client = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const clean = React.useMemo(() => {
    if (!client) return ""
    const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
    const doc = new DOMParser().parseFromString(safe, "text/html")
    doc.querySelectorAll("a[href]").forEach((a) => {
      a.setAttribute("target", "_blank")
      a.setAttribute("rel", "noopener noreferrer nofollow")
    })
    return doc.body.innerHTML
  }, [client, html])

  return <div className={cn(richTextClass, className)} dangerouslySetInnerHTML={{ __html: clean }} />
}
