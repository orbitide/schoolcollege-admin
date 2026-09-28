import type * as React from "react"

import { dashboardMenuIcons } from "@/components/configurations/dashboard-menu-icons"
import type { DashboardMenu } from "@/lib/institutes"
import { cn } from "@/lib/utils"

export type DashboardMenuLook = Pick<
  DashboardMenu,
  | "name"
  | "icon"
  | "fontColor"
  | "backgroundColor"
  | "borderColor"
  | "hoverFontColor"
  | "hoverBackgroundColor"
  | "hoverBorderColor"
>

// A dashboard menu's button as the dashboard draws it (legacy
// _DashboardMenu: a large button, icon then name). Blank colours fall back
// to the primary button, and blank hover colours to the normal ones.
// `hovered` pins the hover look, for previews.
export function DashboardMenuButton({
  menu,
  hovered,
  size = "default",
  className,
}: {
  menu: DashboardMenuLook
  hovered?: boolean
  size?: "default" | "sm"
  className?: string
}) {
  const fg = menu.fontColor.trim() || "var(--primary-foreground)"
  const bg = menu.backgroundColor.trim() || "var(--primary)"
  const border = menu.borderColor.trim() || bg
  const hover = {
    fg: menu.hoverFontColor.trim() || fg,
    bg: menu.hoverBackgroundColor.trim() || bg,
    border: menu.hoverBorderColor.trim() || border,
  }
  const style = {
    "--menu-fg": hovered ? hover.fg : fg,
    "--menu-bg": hovered ? hover.bg : bg,
    "--menu-border": hovered ? hover.border : border,
    "--menu-hover-fg": hover.fg,
    "--menu-hover-bg": hover.bg,
    "--menu-hover-border": hover.border,
  } as React.CSSProperties
  const Icon = dashboardMenuIcons[menu.icon]?.Icon

  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border-2 font-medium whitespace-nowrap transition-colors",
        "[color:var(--menu-fg)] [background-color:var(--menu-bg)] [border-color:var(--menu-border)]",
        "hover:[color:var(--menu-hover-fg)] hover:[background-color:var(--menu-hover-bg)] hover:[border-color:var(--menu-hover-border)]",
        size === "sm" ? "h-7 px-2.5 text-xs [&_svg]:size-3.5" : "h-11 px-5 text-base [&_svg]:size-5",
        className
      )}
    >
      {Icon && <Icon aria-hidden />}
      {menu.name || "Menu name"}
    </span>
  )
}
