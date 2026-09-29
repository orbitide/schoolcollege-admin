import type { Metadata } from "next"

import { TicketForm } from "@/components/support/ticket-form"

export const metadata: Metadata = {
  title: "New ticket · SMS Admin",
}

export default function Page() {
  return <TicketForm />
}
