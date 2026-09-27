"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  ActiveBar,
  NavIcon,
  navButtonClass,
  type NavTone,
} from "@/components/nav-main"
import { Highlight, rankByQuery } from "@/components/nav-search"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MoreHorizontalIcon, FolderIcon, ShareIcon, Trash2Icon } from "lucide-react"

export function NavDocuments({
  items,
  query = "",
}: {
  items: {
    name: string
    url: string
    icon: React.ReactNode
    tone?: NavTone
  }[]
  query?: string
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const visible = rankByQuery(items, (item) => item.name, query)

  if (visible.length === 0) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
        Operations
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {visible.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              className={navButtonClass}
            >
              <Link href={item.url}>
                <ActiveBar />
                <NavIcon icon={item.icon} tone={item.tone} />
                <span>
                  <Highlight text={item.name} query={query} />
                </span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="top-2.5! rounded-sm data-[state=open]:bg-accent"
                >
                  <MoreHorizontalIcon
                  />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <FolderIcon
                  />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ShareIcon
                  />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2Icon
                  />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
