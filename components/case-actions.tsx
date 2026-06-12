"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { runInvestigation, analystDecision } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Play, Loader2, Check, X, FileQuestion } from "lucide-react"

export function RunInvestigationButton({ caseId, hasRun }: { caseId: string; hasRun: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function run() {
    start(async () => {
      await runInvestigation(caseId)
      router.refresh()
    })
  }

  return (
    <Button onClick={run} disabled={pending} size="sm">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      {pending ? "Orchestrating agents…" : hasRun ? "Re-run investigation" : "Run investigation"}
    </Button>
  )
}

export function AnalystReviewPanel({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [pending, start] = useTransition()
  const [busyAction, setBusyAction] = useState<string | null>(null)

  function decide(action: "approve" | "reject" | "request_documents") {
    setBusyAction(action)
    start(async () => {
      await analystDecision({ case_id: caseId, action, note: note || undefined, analyst: "Senior Analyst" })
      setNote("")
      setBusyAction(null)
      router.refresh()
    })
  }

  return (
    <Card className="border-risk-medium/30 bg-risk-medium-bg/40">
      <CardHeader>
        <CardTitle className="text-base">Human Review Required</CardTitle>
        <CardDescription>
          This case was escalated to an analyst. Review the agent findings and record a decision.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          placeholder="Add a review note (optional)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="bg-card"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => decide("approve")} disabled={pending} className="bg-risk-low text-white hover:bg-risk-low/90">
            {busyAction === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Approve
          </Button>
          <Button onClick={() => decide("reject")} disabled={pending} variant="destructive">
            {busyAction === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Reject
          </Button>
          <Button onClick={() => decide("request_documents")} disabled={pending} variant="outline">
            {busyAction === "request_documents" ? <Loader2 className="size-4 animate-spin" /> : <FileQuestion className="size-4" />}
            Request more documents
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
