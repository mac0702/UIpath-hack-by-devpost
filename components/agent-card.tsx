import { AGENT_LABELS, type AgentOutputRow, type AgentName } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { FileText, ScanFace, AtSign, Banknote, Scale, Check, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const AGENT_ICONS: Record<AgentName, typeof FileText> = {
  document_agent: FileText,
  face_agent: ScanFace,
  email_phone_agent: AtSign,
  financial_agent: Banknote,
  decision_agent: Scale,
}

function riskTone(score: number | null) {
  if (score === null) return "text-muted-foreground"
  if (score >= 70) return "text-risk-high"
  if (score >= 40) return "text-risk-medium"
  return "text-risk-low"
}

function ResultDetails({ agent, result }: { agent: AgentName; result: Record<string, unknown> | null }) {
  if (!result) return null
  const entries: { label: string; value: string }[] = []
  const r = result as Record<string, any>

  if (agent === "document_agent") {
    if (r.extracted_name) entries.push({ label: "Extracted name", value: String(r.extracted_name) })
    if (r.extracted_dob) entries.push({ label: "Extracted DOB", value: String(r.extracted_dob) })
    if (r.name_mismatch !== undefined) entries.push({ label: "Name match", value: r.name_mismatch ? "Mismatch" : "OK" })
  }
  if (agent === "face_agent" && r.face_match != null) {
    entries.push({ label: "Face similarity", value: `${r.face_match}%` })
    entries.push({ label: "Threshold", value: `${r.threshold}%` })
  }
  if (agent === "email_phone_agent") {
    if (r.risk) entries.push({ label: "Risk level", value: String(r.risk) })
    if (r.email_domain) entries.push({ label: "Email domain", value: String(r.email_domain) })
  }
  if (agent === "financial_agent") {
    if (r.observed_monthly_inflow != null)
      entries.push({ label: "Observed inflow", value: `₹${Number(r.observed_monthly_inflow).toLocaleString()}` })
    if (r.declared_salary != null) entries.push({ label: "Declared salary", value: `₹${Number(r.declared_salary).toLocaleString()}` })
    if (r.anomaly_score != null) entries.push({ label: "Anomaly score", value: String(r.anomaly_score) })
  }
  if (entries.length === 0) return null

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs">
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col">
          <dt className="text-muted-foreground">{e.label}</dt>
          <dd className="font-medium tabular-nums">{e.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function AgentCard({ output }: { output: AgentOutputRow }) {
  const Icon = AGENT_ICONS[output.agent]
  const isException = output.status === "needs_action"
  const reasons = (output.reasons ?? []) as string[]

  return (
    <Card className={cn("p-4", isException && "border-risk-medium/40 bg-risk-medium-bg/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{AGENT_LABELS[output.agent]}</p>
            <p className="text-xs text-muted-foreground">
              {isException ? (
                <span className="inline-flex items-center gap-1 text-risk-medium">
                  <AlertTriangle className="size-3" /> Action required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-risk-low">
                  <Check className="size-3" /> Completed
                </span>
              )}
            </p>
          </div>
        </div>
        {output.score !== null && (
          <div className="text-right">
            <p className={cn("font-mono text-lg font-semibold tabular-nums", riskTone(output.score))}>{output.score}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">risk</p>
          </div>
        )}
      </div>

      <ResultDetails agent={output.agent} result={output.result} />

      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
