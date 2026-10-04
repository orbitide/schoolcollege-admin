import { BrandMark } from "@/components/brand-mark"
import { cn } from "@/lib/utils"

// Shown while a page's data is on its way, instead of a blank screen: the
// brand badge inside a spinning gradient ring. `fullScreen` covers the whole
// window (before the panel itself can render).
export function PageLoader({ label = "Loading", fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-5 p-6",
        fullScreen && "min-h-svh bg-background"
      )}
    >
      <div className="relative flex size-20 items-center justify-center">
        {/* Soft glow that breathes behind the ring. */}
        <span className="absolute inset-0 rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-25 blur-xl motion-safe:animate-pulse" />
        {/* The spinning ring: a conic gradient masked to a thin band. */}
        <span
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--color-indigo-500)_120deg,var(--color-fuchsia-500)_300deg,transparent_360deg)] motion-safe:animate-spin [mask:radial-gradient(farthest-side,transparent_calc(100%-4px),#000_calc(100%-3px))]"
          style={{ animationDuration: "1.1s" }}
        />
        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 [&_svg]:size-6!">
          <BrandMark />
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full bg-violet-500 motion-safe:animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}
