import type { Metadata } from "next"

import { InstituteForm } from "@/components/institutes/institute-form"

export const metadata: Metadata = {
  title: "Add institute · SMS Admin",
}

export default function NewInstitutePage() {
  return <InstituteForm />
}
