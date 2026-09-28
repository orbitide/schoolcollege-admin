import type * as React from "react"

export { cn } from "cn"

// Turn an inline CSS string ("color: red; font-size: 20px") into a React style
// object. Unknown or invalid declarations are simply ignored by the browser.
export function parseInlineStyle(css: string): React.CSSProperties {
  const style: Record<string, string> = {}
  for (const declaration of css.split(";")) {
    const index = declaration.indexOf(":")
    if (index === -1) continue
    const property = declaration.slice(0, index).trim().toLowerCase()
    const value = declaration.slice(index + 1).trim()
    if (!/^-?[a-z]+(-[a-z]+)*$/.test(property) || !value) continue
    style[property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())] =
      value
  }
  return style
}
