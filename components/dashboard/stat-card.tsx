import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

// A dashboard KPI: the figure, what it is, and a line of context. With
// `href` the whole card opens the records behind the count.
export function StatCard({
  label,
  value,
  headline,
  detail,
  icon,
  href,
}: {
  label: string
  value: string
  headline: string
  detail?: string
  icon?: React.ReactNode
  href?: string
}) {
  const card = (
    <Card
      className={cn(
        "@container/card h-full bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card",
        href && "transition-colors group-hover:border-primary/40"
      )}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {icon && (
          <CardAction className="text-muted-foreground [&_svg]:size-5">{icon}</CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex w-full items-center gap-1 font-medium">
          <span className="line-clamp-1">{headline}</span>
          {href && (
            <ChevronRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
        {detail && <div className="text-muted-foreground">{detail}</div>}
      </CardFooter>
    </Card>
  )

  if (!href) return card
  return (
    <Link href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
      {card}
    </Link>
  )
}

// The row of KPI cards at the top of a dashboard.
export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {children}
    </div>
  )
}
