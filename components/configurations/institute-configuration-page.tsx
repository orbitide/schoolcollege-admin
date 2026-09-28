"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ConfigurationFormBody } from "@/components/institutes/institute-configuration-form"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Card, CardContent } from "@/components/ui/card"
import { useAccessibleInstitutes } from "@/lib/current-user"

// Legacy "Institute Configurations" (InstituteConfiguration/GeneralConfiguration,
// under Configurations): pick an institute, then edit its configuration. The
// picker only shows for users with more than one institute, as in legacy;
// the rest go straight to theirs. The same form is on the institute's own
// configuration tab.
export function InstituteConfigurationPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const canPick = institutes.length > 1
  const institute = canPick
    ? institutes.find((i) => String(i.id) === searchParams.get("institute"))
    : institutes[0]

  function pickInstitute(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set("institute", value)
    else params.delete("institute")
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Institute Configurations</h2>
        <p className="text-sm text-muted-foreground">
          Result, report, admit card, SMS, exam, attendance fine and teacher settings per institute.
        </p>
      </div>

      {canPick && (
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={pickInstitute}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select an institute"
            />
          </CardContent>
        </Card>
      )}

      {institute ? (
        <ConfigurationFormBody key={institute.id} institute={institute} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {canPick
              ? "Select an institute to see its configuration."
              : "You don't have access to any institute."}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
