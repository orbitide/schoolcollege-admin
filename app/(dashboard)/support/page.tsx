import type { Metadata } from "next"

import { TicketList } from "@/components/support/ticket-list"

export const metadata: Metadata = {
  title: "Support tickets · SMS Admin",
}

// Open to everyone: institute users see their institutes' tickets.
export default function Page() {
  return <TicketList />
}
