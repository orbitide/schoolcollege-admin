"use client"

import * as React from "react"
import DOMPurify from "dompurify"

import { cn } from "@/lib/utils"

// Typography for post HTML, shared by the editor and the reader so a post
// looks the same in both.
export const richTextClass = cn(
  "text-sm leading-relaxed break-words",
  "[&_p]:my-2 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:font-mono [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.85em]",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-3 [&_img]:inline-block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
  "[&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-inherit dark:[&_mark]:bg-yellow-500/40",
  // Tables, with room to scroll when wide.
  "[&_.tableWrapper]:my-3 [&_.tableWrapper]:overflow-x-auto [&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse",
  "[&_td]:relative [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:relative [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_td_p]:my-0 [&_th_p]:my-0",
  // YouTube embeds.
  "[&_div[data-youtube-video]]:my-3 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:max-w-2xl [&_iframe]:rounded-md",
  "[&_hr]:my-4 [&>*:first-child]:mt-0"
)

const noop = () => () => {}

// The only embeds a post may carry: YouTube's privacy-enhanced player.
const EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,}(\?[\w=&%-]*)?$/

// Sanitises post HTML for reading: script, event handlers and any iframe
// but a YouTube embed are removed. Legacy showed it raw (Html.Raw), which
// let any author run script on the site. Links open in a new tab.
export function sanitizePostHtml(html: string) {
  const safe = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "allow", "target"],
  })
  const doc = new DOMParser().parseFromString(safe, "text/html")
  doc.querySelectorAll("iframe").forEach((frame) => {
    if (!EMBED.test(frame.getAttribute("src") ?? "")) frame.remove()
    else frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups")
  })
  doc.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank")
    a.setAttribute("rel", "noopener noreferrer nofollow")
  })
  return doc.body.innerHTML
}

// Post HTML as a reader sees it, sanitised (sanitizePostHtml).
export function PostContent({ html, className }: { html: string; className?: string }) {
  // DOMPurify needs the browser's DOM; the server (and hydration) render
  // the box empty.
  const client = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const clean = React.useMemo(() => (client ? sanitizePostHtml(html) : ""), [client, html])

  return <div className={cn(richTextClass, className)} dangerouslySetInnerHTML={{ __html: clean }} />
}
