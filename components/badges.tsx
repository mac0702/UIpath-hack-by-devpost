import { cn } from "@/lib/utils"
import type { RiskLevel, CaseStatus } from "@/lib/types"

export function RiskBadge({ level, score, className }: { level: RiskLevel | null; score?: number | null; className?: string }) {
  if (!level) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
        Pending
      </span>
    )
  }
  const styles: Record<RiskLevel, string> = {
    LOW: "bg-risk-low-bg text-risk-low border-risk-low/30",
    MEDIUM: "bg-risk-medium-bg text-risk-medium border-risk-medium/30",
    HIGH: "bg-risk-high-bg text-risk-high border-risk-high/30",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold", styles[level], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {level}
      {typeof score === "number" ? <span className="font-mono tabular-nums">· {score}</span> : null}
    </span>
  )
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  created: "Created",
  investigating: "Investigating",
  needs_documents: "Needs Documents",
  manual_verification: "Manual Verification",
  human_review: "Human Review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
}

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const styles: Record<CaseStatus, string> = {
    created: "bg-muted text-muted-foreground border-border",
    investigating: "bg-primary/10 text-primary border-primary/30",
    needs_documents: "bg-risk-medium-bg text-risk-medium border-risk-medium/30",
    manual_verification: "bg-risk-medium-bg text-risk-medium border-risk-medium/30",
    human_review: "bg-risk-medium-bg text-risk-medium border-risk-medium/30",
    approved: "bg-risk-low-bg text-risk-low border-risk-low/30",
    rejected: "bg-risk-high-bg text-risk-high border-risk-high/30",
    closed: "bg-muted text-muted-foreground border-border",
  }
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", styles[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}
