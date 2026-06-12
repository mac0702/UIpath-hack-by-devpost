import Link from "next/link"
import { notFound } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { RiskBadge, StatusBadge } from "@/components/badges"
import { MaestroStages } from "@/components/maestro-stages"
import { AgentCard } from "@/components/agent-card"
import { RiskReport } from "@/components/risk-report"
import { EventTimeline } from "@/components/event-timeline"
import { RunInvestigationButton, AnalystReviewPanel } from "@/components/case-actions"
import { getCaseBundle } from "@/lib/actions"
import { DOC_TYPE_LABELS, type DocType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, AlertTriangle, Gavel } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bundle = await getCaseBundle(id)
  if (!bundle) notFound()
  const { caseRow, documents, agents, events, report } = bundle

  const hasRun = agents.length > 0
  const hasException = agents.some((a) => a.status === "needs_action")
  const needsReview = caseRow.status === "human_review" || caseRow.status === "manual_verification"
  const needsDocs = caseRow.status === "needs_documents"
  const isClosed = caseRow.status === "approved" || caseRow.status === "rejected"

  const fields = [
    { label: "Date of birth", value: caseRow.date_of_birth },
    { label: "ID type", value: caseRow.id_type?.toUpperCase() },
    { label: "ID number", value: caseRow.id_number },
    { label: "Phone", value: caseRow.phone },
    { label: "Email", value: caseRow.email },
    { label: "Declared salary", value: caseRow.declared_salary ? `₹${Number(caseRow.declared_salary).toLocaleString()}` : null },
  ]

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{caseRow.applicant_name}</h1>
              <StatusBadge status={caseRow.status} />
              <RiskBadge level={caseRow.risk_level} score={caseRow.risk_score} />
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{caseRow.case_number}</p>
          </div>
          <RunInvestigationButton caseId={caseRow.id} hasRun={hasRun} />
        </div>

        {/* Alerts */}
        <div className="mt-5 flex flex-col gap-3">
          {needsDocs && (
            <div className="flex items-start gap-3 rounded-lg border border-risk-medium/30 bg-risk-medium-bg/50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk-medium" />
              <p>
                <span className="font-medium text-risk-medium">Exception — Missing document.</span> The Document
                Verification Agent could not proceed. Upload the required identity document, then re-run the investigation.
              </p>
            </div>
          )}
          {isClosed && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <Gavel className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>
                Final decision:{" "}
                <span className={caseRow.decision === "rejected" ? "font-semibold text-risk-high" : "font-semibold text-risk-low"}>
                  {caseRow.decision === "rejected" ? "Rejected" : "Approved"}
                </span>
                {caseRow.assigned_analyst ? ` by ${caseRow.assigned_analyst}` : ""}.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Left column: Maestro + applicant + docs */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maestro Case Stages</CardTitle>
              </CardHeader>
              <CardContent>
                <MaestroStages caseRow={caseRow} hasException={hasException || needsReview} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicant</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-2.5 text-sm">
                  {fields.map((f) => (
                    <div key={f.label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="text-right font-medium break-all">{f.value || "—"}</dd>
                    </div>
                  ))}
                </dl>
                {caseRow.address && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{caseRow.address}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents ({documents.length})</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
                {documents.map((d) => {
                  const isImg = d.content_type?.startsWith("image/")
                  const fileUrl = d.blob_pathname
                    ? `/api/file?pathname=${encodeURIComponent(d.blob_pathname)}`
                    : null
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 rounded-md border border-border p-2.5">
                      {isImg && fileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl || "/placeholder.svg"}
                          alt={`${DOC_TYPE_LABELS[d.doc_type as DocType] ?? d.doc_type} thumbnail`}
                          className="size-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{DOC_TYPE_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{d.file_name}</p>
                      </div>
                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right column: agents, report, review, timeline */}
          <div className="flex flex-col gap-6">
            {needsReview && <AnalystReviewPanel caseId={caseRow.id} />}

            {report && <RiskReport report={report} />}

            {hasRun ? (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Agent Outputs</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {agents
                    .filter((a) => a.agent !== "decision_agent")
                    .map((a) => (
                      <AgentCard key={a.id} output={a} />
                    ))}
                </div>
              </div>
            ) : (
              <Card className="flex flex-col items-center gap-3 p-10 text-center">
                <Gavel className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Investigation not started</p>
                  <p className="text-sm text-muted-foreground">
                    Run the investigation to orchestrate the five agents and generate a fraud risk report.
                  </p>
                </div>
                <RunInvestigationButton caseId={caseRow.id} hasRun={hasRun} />
              </Card>
            )}

            {events.length > 0 && <EventTimeline events={events} />}
          </div>
        </div>
      </div>
    </main>
  )
}
