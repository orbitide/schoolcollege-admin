"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminUsers, useUserInstitutes } from "@/lib/global-settings"
import { useInstitutes } from "@/lib/institutes-store"

const LIST_HREF = "/basic-settings/user-institutes"

// Legacy UserInstitute/Details: opened from one link, it shows that link's
// user and every institute linked to them.
export function UserInstituteDetail({ id }: { id: number }) {
  const links = useUserInstitutes()
  const adminUsers = useAdminUsers()
  const institutes = useInstitutes()
  const link = links.find((l) => l.id === id)
  const user = adminUsers.find((u) => u.id === link?.userId)

  if (!link || !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">No user institute found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={LIST_HREF}>Back to user institutes</Link>
        </Button>
      </div>
    )
  }

  const userLinks = links
    .filter((l) => l.userId === user.id)
    .flatMap((l) => {
      const institute = institutes.find((i) => i.id === l.instituteId)
      return institute ? [{ link: l, institute }] : []
    })
    .sort((a, b) => a.institute.name.localeCompare(b.institute.name))

  const rows: [string, React.ReactNode][] = [
    ["User name", user.name],
    ["User email", user.email],
    ["Role", user.role],
    ["Total institute", userLinks.length],
    ["Created", `${link.createdBy}, ${new Date(link.createdAt).toLocaleString("en-GB")}`],
    ["Last modified", `${link.modifiedBy}, ${new Date(link.modifiedAt).toLocaleString("en-GB")}`],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={LIST_HREF}>
            <ArrowLeftIcon data-icon="inline-start" />
            User institutes
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${LIST_HREF}/user-wise?user=${user.id}`}>
            <PencilIcon data-icon="inline-start" />
            Edit institutes
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{user.name}</CardTitle>
            <StatusBadge status={link.status} />
          </div>
          <CardDescription>User institute details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Institute List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>EIIN</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userLinks.map(({ link: l, institute }) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/institutes/${institute.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {institute.name}
                      </Link>
                    </TableCell>
                    <TableCell>{institute.shortName}</TableCell>
                    <TableCell className="tabular-nums">{institute.eiin}</TableCell>
                    <TableCell>{institute.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
