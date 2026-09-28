"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Card, CardContent } from "@/components/ui/card"
import { useAccessibleInstitutes } from "@/lib/current-user"

// The institute a Configurations page edits, as legacy picks it: a user
// with several institutes chooses one (kept in ?institute=), the rest get
// their only one.
export function useInstitutePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1
  const institute = canPick
    ? institutes.find((i) => String(i.id) === searchParams.get("institute"))
    : institutes[0]

  function pick(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set("institute", value)
    else params.delete("institute")
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return { institutes, canPick, institute, pick }
}

export function InstitutePicker({ picker }: { picker: ReturnType<typeof useInstitutePicker> }) {
  const { institutes, canPick, institute, pick } = picker
  if (!canPick) return null
  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterField
          label="Institute"
          required
          value={institute ? String(institute.id) : ""}
          onChange={pick}
          options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
          placeholder="Select an institute"
        />
      </CardContent>
    </Card>
  )
}

export function NoInstitute({ picker, what }: { picker: ReturnType<typeof useInstitutePicker>; what: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {picker.canPick ? `Select an institute to see its ${what}.` : "You don't have access to any institute."}
      </CardContent>
    </Card>
  )
}
