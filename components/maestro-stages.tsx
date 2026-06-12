import { STAGE_ORDER, STAGE_LABELS, type Stage, type CaseRow } from "@/lib/types"
import { Check, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function MaestroStages({ caseRow, hasException }: { caseRow: CaseRow; hasException: boolean }) {
  const currentIndex = STAGE_ORDER.indexOf(caseRow.current_stage)
  const isClosed = caseRow.status === "approved" || caseRow.status === "rejected" || caseRow.current_stage === "case_closed"

  function stageState(stage: Stage, idx: number): "done" | "active" | "todo" | "exception" {
    if (isClosed) return "done"
    if (idx < currentIndex) return "done"
    if (idx === currentIndex) {
      if (hasException && (stage === "document_verification" || stage === "human_review")) return "exception"
      if (caseRow.status === "investigating") return "active"
      if (stage === "human_review" && (caseRow.status === "human_review" || caseRow.status === "manual_verification"))
        return "exception"
      return "active"
    }
    return "todo"
  }

  return (
    <div className="flex flex-col gap-1">
      {STAGE_ORDER.map((stage, idx) => {
        const state = stageState(stage, idx)
        return (
          <div key={stage} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  state === "done" && "border-risk-low bg-risk-low text-white",
                  state === "active" && "border-primary bg-primary text-primary-foreground",
                  state === "exception" && "border-risk-high bg-risk-high text-white",
                  state === "todo" && "border-border bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="size-4" />
                ) : state === "active" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : state === "exception" ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  idx + 1
                )}
              </span>
              {idx < STAGE_ORDER.length - 1 && (
                <span className={cn("w-px flex-1 my-1", state === "done" ? "bg-risk-low/40" : "bg-border")} />
              )}
            </div>
            <div className="flex flex-1 flex-col pb-3 pt-0.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "todo" ? "text-muted-foreground" : "text-foreground",
                  state === "exception" && "text-risk-high",
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-muted-foreground">
                {state === "done" && "Completed"}
                {state === "active" && "In progress"}
                {state === "exception" && "Exception — needs attention"}
                {state === "todo" && "Pending"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
