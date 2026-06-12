import type { ReportRow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const WEIGHTS: Record<string, number> = { document: 0.3, face: 0.2, email_phone: 0.2, financial: 0.3 }
const CONTRIB_LABELS: Record<string, string> = {
  document: "Document",
  face: "Face",
  email_phone: "Email & Phone",
  financial: "Financial",
}

function gaugeColor(score: number) {
  if (score >= 70) return "text-risk-high"
  if (score >= 40) return "text-risk-medium"
  return "text-risk-low"
}

export function RiskReport({ report }: { report: ReportRow }) {
  const score = report.risk_score
  const reasons = (report.reasons ?? []) as string[]
  const contributions = (report.agent_breakdown ?? {}) as Record<string, number>
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - score / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fraud Risk Report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative flex size-32 shrink-0 items-center justify-center">
            <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={gaugeColor(score)}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn("font-mono text-3xl font-bold tabular-nums", gaugeColor(score))}>{score}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <span
              className={cn(
                "inline-flex rounded-md border px-2.5 py-1 text-sm font-semibold",
                report.risk_level === "HIGH" && "border-risk-high/30 bg-risk-high-bg text-risk-high",
                report.risk_level === "MEDIUM" && "border-risk-medium/30 bg-risk-medium-bg text-risk-medium",
                report.risk_level === "LOW" && "border-risk-low/30 bg-risk-low-bg text-risk-low",
              )}
            >
              {report.risk_level} RISK
            </span>
            {report.summary && <p className="mt-3 text-sm leading-relaxed text-foreground">{report.summary}</p>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weighted Contributions
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(contributions).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">
                  {CONTRIB_LABELS[key] ?? key}
                  <span className="ml-1 text-[10px]">({Math.round((WEIGHTS[key] ?? 0) * 100)}%)</span>
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", gaugeColor(value).replace("text-", "bg-"))} style={{ width: `${value}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {reasons.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Reasons</p>
            <ol className="flex flex-col gap-1.5">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {report.recommendation && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommendation</p>
            <p className="mt-1 text-sm">{report.recommendation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
