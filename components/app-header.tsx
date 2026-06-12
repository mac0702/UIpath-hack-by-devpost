import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">Sentinel</span>
            <span className="text-[11px] text-sidebar-foreground/60">Fraud Investigation Console</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/cases/new"
            className="rounded-md bg-sidebar-primary px-3 py-1.5 font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90"
          >
            New Case
          </Link>
        </nav>
      </div>
    </header>
  )
}
