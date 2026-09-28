import type { Metadata } from "next"

import { RequireSurface } from "@/components/require-surface"
import { SmsTemplateForm } from "@/components/sms/sms-template-form"

export const metadata: Metadata = {
  title: "Edit SMS template · SMS Admin",
}

export default async function EditSmsTemplatePage({
  params,
  searchParams,
}: PageProps<"/sms/templates/[id]/edit">) {
  const { id } = await params
  const { returnTo } = await searchParams

  return (
    <RequireSurface resource="sms-template" surface={["Admin", "Manage"]}>
      <SmsTemplateForm
        templateId={Number(id)}
        returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
      />
    </RequireSurface>
  )
}
