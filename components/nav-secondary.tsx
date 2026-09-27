"use client"

import * as React from "react"

import { Highlight, rankByQuery } from "@/components/nav-search"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  query = "",
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
  query?: string
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const visible = rankByQuery(items, (item) => item.title, query)

  if (visible.length === 0) return null

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <a href={item.url}>
                  {item.icon}
                  <span>
                    <Highlight text={item.title} query={query} />
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
