import { notFound } from "next/navigation"

// Unknown URLs land here so the 404 renders inside the dashboard layout (with the sidebar).
export default function UnknownPage() {
  notFound()
}
