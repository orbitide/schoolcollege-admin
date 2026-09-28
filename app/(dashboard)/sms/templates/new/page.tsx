import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { SmsTemplateForm } from "@/components/sms/sms-template-form"

export const metadata: Metadata = {
  title: "Add SMS template · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

// ?institute= and ?type= preselect the institute and SMS type.
export default async function NewSmsTemplatePage({
  searchParams,
}: PageProps<"/sms/templates/new">) {
  const query = await searchParams

  return (
    <RequireSurface resource="sms-template" surface={["Admin", "Manage"]}>
      <SmsTemplateForm
        instituteId={Number(one(query.institute)) || undefined}
        type={one(query.type)}
        returnTo={one(query.returnTo)}
      />
    </RequireSurface>
  )
}
