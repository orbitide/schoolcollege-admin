"use client"

import * as React from "react"
import { createPortal } from "react-dom"

const noop = () => () => {}

// A copy of the report that is all the page prints (legacy printElem). It
// prints from this tab rather than a /print page because the reports read
// merit lists, which live only in this tab's memory. `pageSize` is a CSS
// @page size, e.g. "A4 landscape"; `margin` the page margin.
export function PrintArea({
  pageSize,
  margin = "5mm",
  children,
}: {
  pageSize: string
  margin?: string
  children: React.ReactNode
}) {
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  if (!mounted) return null
  return createPortal(
    <div className="report-print-area hidden bg-white print:block">
      {children}
      <style>{`@media print {
        @page { size: ${pageSize}; margin: ${margin}; }
        body > :not(.report-print-area) { display: none !important; }
      }`}</style>
    </div>,
    document.body
  )
}
