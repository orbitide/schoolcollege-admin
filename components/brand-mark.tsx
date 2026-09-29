import { cn } from "@/lib/utils"

// The platform's monogram: a geometric "S" with an accent dot, drawn in
// currentColor so it sits on the gradient badge in the sidebar and login.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <path d="M16.5 5.5H10a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7H6.5" />
      <circle cx="19" cy="5.5" r="0.6" fill="currentColor" />
    </svg>
  )
}
