export type CaseStatus =
  | "created"
  | "investigating"
  | "needs_documents"
  | "manual_verification"
  | "human_review"
  | "approved"
  | "rejected"
  | "closed"

export type Stage =
  | "case_created"
  | "document_verification"
  | "identity_verification"
  | "financial_analysis"
  | "risk_assessment"
  | "human_review"
  | "decision"
  | "case_closed"

export const STAGE_ORDER: Stage[] = [
  "case_created",
  "document_verification",
  "identity_verification",
  "financial_analysis",
  "risk_assessment",
  "human_review",
  "decision",
  "case_closed",
]

export const STAGE_LABELS: Record<Stage, string> = {
  case_created: "Case Created",
  document_verification: "Document Verification",
  identity_verification: "Identity Verification",
  financial_analysis: "Financial Analysis",
  risk_assessment: "Risk Assessment",
  human_review: "Human Review",
  decision: "Decision",
  case_closed: "Case Closed",
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

export type AgentName =
  | "document_agent"
  | "face_agent"
  | "email_phone_agent"
  | "financial_agent"
  | "decision_agent"

export const AGENT_LABELS: Record<AgentName, string> = {
  document_agent: "Document Verification Agent",
  face_agent: "Face Verification Agent",
  email_phone_agent: "Email & Phone Risk Agent",
  financial_agent: "Financial Pattern Agent",
  decision_agent: "Fraud Decision Agent",
}

export interface CaseRow {
  id: string
  case_number: string
  applicant_name: string
  date_of_birth: string | null
  id_type: string | null
  id_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  declared_salary: number | null
  status: CaseStatus
  current_stage: Stage
  risk_score: number | null
  risk_level: RiskLevel | null
  decision: string | null
  assigned_analyst: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRow {
  id: string
  case_id: string
  doc_type: string
  file_name: string | null
  content_summary: string | null
  extracted: Record<string, unknown> | null
  blob_pathname: string | null
  content_type: string | null
  file_size: number | null
  created_at: string
}

export interface AgentOutputRow {
  id: string
  case_id: string
  agent: AgentName
  stage: Stage
  status: string
  score: number | null
  result: Record<string, unknown> | null
  reasons: string[] | null
  created_at: string
}

export interface CaseEventRow {
  id: string
  case_id: string
  stage: Stage
  event_type: string
  message: string | null
  actor: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ReportRow {
  id: string
  case_id: string
  risk_score: number
  risk_level: RiskLevel
  summary: string | null
  reasons: string[] | null
  agent_breakdown: Record<string, unknown> | null
  recommendation: string | null
  created_at: string
}

export const DOC_TYPES = ["aadhaar", "pan", "passport", "selfie", "bank_statement"] as const
export type DocType = (typeof DOC_TYPES)[number]

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN Card",
  passport: "Passport",
  selfie: "Selfie",
  bank_statement: "Bank Statement",
}
