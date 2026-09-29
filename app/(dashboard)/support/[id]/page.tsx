import type { Metadata } from "next"

import { TicketDetail } from "@/components/support/ticket-detail"

export const metadata: Metadata = {
  title: "Ticket · SMS Admin",
}

export default async function Page({ params }: PageProps<"/support/[id]">) {
  const { id } = await params
  return <TicketDetail id={Number(id)} />
}
