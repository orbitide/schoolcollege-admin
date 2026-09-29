import { redirect } from "next/navigation"

// The Fees menu has no page of its own; its counter is the usual start.
export default function FeesPage() {
  redirect("/fees/collect")
}
