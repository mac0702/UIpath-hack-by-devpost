import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { RiskBadge, StatusBadge } from "@/components/badges"
import { getCases, getStats } from "@/lib/actions"
import { STAGE_LABELS } from "@/lib/types"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileSearch, ShieldAlert, UserCheck, CheckCircle2, Plus, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function DashboardPage() {
  const [cases, stats] = await Promise.all([getCases(), getStats()])

  const cards = [
    { label: "Total Cases", value: stats.total, icon: FileSearch, tone: "text-primary" },
    { label: "Awaiting Review", value: stats.in_review, icon: UserCheck, tone: "text-risk-medium" },
    { label: "High Risk", value: stats.high_risk, icon: ShieldAlert, tone: "text-risk-high" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, tone: "text-risk-low" },
  ]

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Investigation Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Synthetic identity fraud cases orchestrated across the agent pipeline.
            </p>
          </div>
          <Link href="/cases/new" className={buttonVariants()}>
            <Plus className="size-4" /> New Case
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`size-4 ${c.tone}`} />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{c.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cases</h2>
          {cases.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <FileSearch className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No cases yet</p>
                <p className="text-sm text-muted-foreground">Create your first fraud investigation to see it here.</p>
              </div>
              <Link href="/cases/new" className={buttonVariants()}>
                <Plus className="size-4" /> Create case
              </Link>
            </Card>
          ) : (
            <Card className="divide-y divide-border p-0">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold text-muted-foreground">
                      {c.applicant_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.applicant_name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {c.case_number} · {timeAgo(c.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="hidden text-xs text-muted-foreground sm:inline">{STAGE_LABELS[c.current_stage]}</span>
                    <StatusBadge status={c.status} />
                    <RiskBadge level={c.risk_level} score={c.risk_score} />
                    <ArrowRight className="hidden size-4 text-muted-foreground sm:inline" />
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
