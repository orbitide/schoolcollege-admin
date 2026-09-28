"use client"

import { InstitutePicker, NoInstitute, useInstitutePicker } from "@/components/configurations/institute-picker"
import { ConfigurationFormBody } from "@/components/institutes/institute-configuration-form"

// Legacy "Institute Configurations" (InstituteConfiguration/GeneralConfiguration,
// under Configurations): pick an institute, then edit its configuration. The
// same form is on the institute's own configuration tab.
export function InstituteConfigurationPage() {
  const picker = useInstitutePicker()
  const { institute } = picker

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Institute Configurations</h2>
        <p className="text-sm text-muted-foreground">
          Result, report, admit card, SMS, exam, attendance fine and teacher settings per institute.
        </p>
      </div>

      <InstitutePicker picker={picker} />

      {institute ? (
        <ConfigurationFormBody key={institute.id} institute={institute} />
      ) : (
        <NoInstitute picker={picker} what="configuration" />
      )}
    </div>
  )
}
