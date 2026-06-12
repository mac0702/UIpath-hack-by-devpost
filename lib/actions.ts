"use server"

import { revalidatePath } from "next/cache"
import { sql } from "./db"
import type { CaseRow, DocumentRow, AgentOutputRow, CaseEventRow, ReportRow, Stage } from "./types"
import {
  runDocumentAgent,
  runFaceAgent,
  runEmailPhoneAgent,
  runFinancialAgent,
  runDecisionAgent,
  type AgentResult,
} from "./agents"

function caseNumber() {
  const d = new Date()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `SIF-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${rand}`
}

async function logEvent(
  caseId: string,
  stage: Stage,
  eventType: string,
  message: string,
  actor = "system",
  metadata: Record<string, unknown> | null = null,
) {
  await sql`
    INSERT INTO case_events (case_id, stage, event_type, message, actor, metadata)
    VALUES (${caseId}, ${stage}, ${eventType}, ${message}, ${actor}, ${metadata ? JSON.stringify(metadata) : null})
  `
}

export async function createCase(input: {
  applicant_name: string
  date_of_birth?: string
  id_type?: string
  id_number?: string
  phone?: string
  email?: string
  address?: string
  declared_salary?: number
}): Promise<string> {
  const cn = caseNumber()
  const rows = (await sql`
    INSERT INTO cases (case_number, applicant_name, date_of_birth, id_type, id_number, phone, email, address, declared_salary, status, current_stage)
    VALUES (${cn}, ${input.applicant_name}, ${input.date_of_birth ?? null}, ${input.id_type ?? null}, ${input.id_number ?? null},
            ${input.phone ?? null}, ${input.email ?? null}, ${input.address ?? null}, ${input.declared_salary ?? null}, 'created', 'case_created')
    RETURNING id
  `) as { id: string }[]
  const id = rows[0].id
  await logEvent(id, "case_created", "case_created", `Case ${cn} created for ${input.applicant_name}`)
  revalidatePath("/")
  return id
}

export async function addDocument(input: {
  case_id: string
  doc_type: string
  file_name?: string
  content_summary?: string
  extracted?: Record<string, unknown>
  blob_pathname?: string
  content_type?: string
  file_size?: number
}) {
  await sql`
    INSERT INTO documents (case_id, doc_type, file_name, content_summary, extracted, blob_pathname, content_type, file_size)
    VALUES (${input.case_id}, ${input.doc_type}, ${input.file_name ?? null}, ${input.content_summary ?? null},
            ${input.extracted ? JSON.stringify(input.extracted) : null},
            ${input.blob_pathname ?? null}, ${input.content_type ?? null}, ${input.file_size ?? null})
  `
  await logEvent(input.case_id, "case_created", "document_uploaded", `Uploaded ${input.doc_type}`, "applicant")
  revalidatePath(`/cases/${input.case_id}`)
}

async function recordAgent(caseId: string, r: AgentResult) {
  await sql`
    INSERT INTO agent_outputs (case_id, agent, stage, status, score, result, reasons)
    VALUES (${caseId}, ${r.agent}, ${r.stage}, ${r.status}, ${r.riskScore}, ${JSON.stringify(r.result)}, ${JSON.stringify(r.reasons)})
  `
}

async function setStage(caseId: string, stage: Stage, status?: string) {
  if (status) {
    await sql`UPDATE cases SET current_stage = ${stage}, status = ${status}, updated_at = now() WHERE id = ${caseId}`
  } else {
    await sql`UPDATE cases SET current_stage = ${stage}, updated_at = now() WHERE id = ${caseId}`
  }
}

export async function runInvestigation(caseId: string) {
  const caseRows = (await sql`SELECT * FROM cases WHERE id = ${caseId}`) as CaseRow[]
  if (caseRows.length === 0) throw new Error("Case not found")
  const caseRow = caseRows[0]
  const documents = (await sql`SELECT * FROM documents WHERE case_id = ${caseId} ORDER BY created_at`) as DocumentRow[]

  // Clear any prior run so re-running is idempotent.
  await sql`DELETE FROM agent_outputs WHERE case_id = ${caseId}`
  await sql`DELETE FROM reports WHERE case_id = ${caseId}`

  await setStage(caseId, "document_verification", "investigating")
  await logEvent(caseId, "document_verification", "stage_start", "Maestro: starting Document Verification")

  // Stage: Document Verification
  const docResult = await runDocumentAgent(caseRow, documents)
  await recordAgent(caseId, docResult)
  await logEvent(caseId, "document_verification", "agent_complete", docResult.reasons[0] ?? "Document agent complete", "document_agent", { riskScore: docResult.riskScore })

  if (docResult.status === "needs_action") {
    await setStage(caseId, "document_verification", "needs_documents")
    await logEvent(caseId, "document_verification", "exception", "Missing document — routed to Request Document workflow", "system")
    revalidatePath(`/cases/${caseId}`)
    return { outcome: "needs_documents" as const }
  }

  // Stage: Identity Verification (face + email/phone)
  await setStage(caseId, "identity_verification")
  await logEvent(caseId, "identity_verification", "stage_start", "Maestro: starting Identity Verification")
  const faceResult = await runFaceAgent(caseRow, documents)
  await recordAgent(caseId, faceResult)
  await logEvent(caseId, "identity_verification", "agent_complete", faceResult.reasons[0] ?? "Face agent complete", "face_agent", { riskScore: faceResult.riskScore })

  const emailResult = await runEmailPhoneAgent(caseRow)
  await recordAgent(caseId, emailResult)
  await logEvent(caseId, "identity_verification", "agent_complete", emailResult.reasons[0] ?? "Email/phone agent complete", "email_phone_agent", { riskScore: emailResult.riskScore })

  let faceException = false
  if (faceResult.status === "needs_action") {
    faceException = true
    await logEvent(caseId, "identity_verification", "exception", "Face match below threshold — manual verification required", "system")
  }

  // Stage: Financial Analysis
  await setStage(caseId, "financial_analysis")
  await logEvent(caseId, "financial_analysis", "stage_start", "Maestro: starting Financial Analysis")
  const finResult = await runFinancialAgent(caseRow, documents)
  await recordAgent(caseId, finResult)
  await logEvent(caseId, "financial_analysis", "agent_complete", finResult.reasons[0] ?? "Financial agent complete", "financial_agent", { riskScore: finResult.riskScore })

  // Stage: Risk Assessment (decision agent combines all)
  await setStage(caseId, "risk_assessment")
  await logEvent(caseId, "risk_assessment", "stage_start", "Maestro: aggregating agent outputs (Fraud Decision Agent)")
  const decision = await runDecisionAgent(caseRow, {
    document: docResult,
    face: faceResult,
    emailPhone: emailResult,
    financial: finResult,
  })
  await recordAgent(caseId, decision)

  await sql`
    INSERT INTO reports (case_id, risk_score, risk_level, summary, reasons, agent_breakdown, recommendation)
    VALUES (${caseId}, ${decision.riskScore}, ${decision.riskLevel}, ${decision.summary}, ${JSON.stringify(decision.reasons)},
            ${JSON.stringify(decision.result.contributions)}, ${decision.recommendation})
  `

  await sql`UPDATE cases SET risk_score = ${decision.riskScore}, risk_level = ${decision.riskLevel}, updated_at = now() WHERE id = ${caseId}`
  await logEvent(caseId, "risk_assessment", "report_ready", `Risk score ${decision.riskScore} (${decision.riskLevel})`, "decision_agent")

  // Human-in-the-loop: risk > 70 OR a face exception => assign analyst
  if (decision.riskScore > 70 || faceException) {
    const analyst = "Analyst Queue"
    const newStatus = faceException ? "manual_verification" : "human_review"
    await setStage(caseId, "human_review", newStatus)
    await sql`UPDATE cases SET assigned_analyst = ${analyst} WHERE id = ${caseId}`
    await logEvent(
      caseId,
      "human_review",
      "assigned",
      faceException
        ? "Routed to analyst for manual face verification"
        : `High risk (${decision.riskScore}) — auto-assigned to analyst for review`,
      "system",
    )
    revalidatePath(`/cases/${caseId}`)
    return { outcome: "human_review" as const, riskScore: decision.riskScore }
  }

  // Low/medium risk with no exception: auto-decision
  await setStage(caseId, "decision")
  const autoDecision = decision.riskLevel === "LOW" ? "approved" : "approved_with_monitoring"
  await sql`UPDATE cases SET decision = ${autoDecision}, status = 'approved', current_stage = 'case_closed', updated_at = now() WHERE id = ${caseId}`
  await logEvent(caseId, "decision", "auto_decision", `Auto-approved (${decision.riskLevel} risk)`, "system")
  await logEvent(caseId, "case_closed", "closed", "Case closed", "system")
  revalidatePath(`/cases/${caseId}`)
  return { outcome: "auto_approved" as const, riskScore: decision.riskScore }
}

export async function analystDecision(input: {
  case_id: string
  action: "approve" | "reject" | "request_documents"
  note?: string
  analyst?: string
}) {
  const { case_id, action, note, analyst = "Analyst" } = input
  if (action === "request_documents") {
    await setStage(case_id, "document_verification", "needs_documents")
    await logEvent(case_id, "human_review", "request_documents", note || "Analyst requested additional documents", analyst)
  } else if (action === "approve") {
    await sql`UPDATE cases SET decision = 'approved', status = 'approved', current_stage = 'case_closed', updated_at = now() WHERE id = ${case_id}`
    await logEvent(case_id, "decision", "approved", note || "Analyst approved the application", analyst)
    await logEvent(case_id, "case_closed", "closed", "Case closed", analyst)
  } else {
    await sql`UPDATE cases SET decision = 'rejected', status = 'rejected', current_stage = 'case_closed', updated_at = now() WHERE id = ${case_id}`
    await logEvent(case_id, "decision", "rejected", note || "Analyst rejected the application", analyst)
    await logEvent(case_id, "case_closed", "closed", "Case closed", analyst)
  }
  revalidatePath(`/cases/${case_id}`)
  revalidatePath("/")
}

// ---- Reads ----

function formatCaseRow(row: any): CaseRow {
  if (!row) return row
  return {
    ...row,
    date_of_birth: row.date_of_birth instanceof Date
      ? row.date_of_birth.toISOString().split("T")[0]
      : row.date_of_birth,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }
}

function formatRowDates<T extends { created_at?: any; updated_at?: any }>(row: T): T {
  if (!row) return row
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }
}

export async function getCases(): Promise<CaseRow[]> {
  const rows = (await sql`SELECT * FROM cases ORDER BY created_at DESC`)
  return rows.map(formatCaseRow)
}

export async function getCase(id: string): Promise<CaseRow | null> {
  const rows = (await sql`SELECT * FROM cases WHERE id = ${id}`)
  return rows[0] ? formatCaseRow(rows[0]) : null
}

export async function getCaseBundle(id: string) {
  const caseRow = await getCase(id)
  if (!caseRow) return null
  const documents = (await sql`SELECT * FROM documents WHERE case_id = ${id} ORDER BY created_at`)
  const agents = (await sql`SELECT * FROM agent_outputs WHERE case_id = ${id} ORDER BY created_at`)
  const events = (await sql`SELECT * FROM case_events WHERE case_id = ${id} ORDER BY created_at`)
  const reports = (await sql`SELECT * FROM reports WHERE case_id = ${id} ORDER BY created_at DESC`)
  return {
    caseRow,
    documents: documents.map(formatRowDates) as DocumentRow[],
    agents: agents.map(formatRowDates) as AgentOutputRow[],
    events: events.map(formatRowDates) as CaseEventRow[],
    report: reports[0] ? (formatRowDates(reports[0]) as ReportRow) : null,
  }
}

export async function getStats() {
  const rows = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('human_review','manual_verification'))::int AS in_review,
      COUNT(*) FILTER (WHERE risk_level = 'HIGH')::int AS high_risk,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
    FROM cases
  `) as { total: number; in_review: number; high_risk: number; approved: number }[]
  return rows[0]
}
