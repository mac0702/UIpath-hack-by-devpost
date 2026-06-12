-- Synthetic Identity Fraud Detection Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Cases Table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    declared_salary NUMERIC(15, 2),
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'investigating', 'needs_documents', 'manual_verification', 'human_review', 'approved', 'rejected', 'closed'
    current_stage VARCHAR(50) DEFAULT 'case_created', -- 'case_created', 'document_verification', 'identity_verification', 'financial_analysis', 'risk_assessment', 'human_review', 'decision', 'case_closed'
    risk_score INT, -- 0 - 100
    risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
    decision VARCHAR(50), -- 'approved', 'approved_with_monitoring', 'rejected', etc.
    assigned_analyst VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for scanning case lists quickly
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- 'aadhaar', 'pan', 'passport', 'selfie', 'bank_statement'
    file_name VARCHAR(255),
    content_summary TEXT,
    extracted JSONB, -- OCR details / structured output
    blob_pathname TEXT, -- Vercel Blob pathname
    content_type VARCHAR(100),
    file_size INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents (case_id);

-- 3. Agent Outputs Table
CREATE TABLE IF NOT EXISTS agent_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    agent VARCHAR(100) NOT NULL, -- 'document_agent', 'face_agent', 'email_phone_agent', 'financial_agent', 'decision_agent'
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'completed', 'failed', 'needs_action'
    score INT, -- Agent-specific risk contribution
    result JSONB, -- Raw AI/rule-based outputs
    reasons JSONB, -- Array of strings detailing the risk markers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_case_id ON agent_outputs (case_id);

-- 4. Case Events Table (Audit Trail)
CREATE TABLE IF NOT EXISTS case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'case_created', 'document_uploaded', 'stage_start', 'agent_complete', 'exception', 'report_ready', 'assigned', 'auto_decision', 'closed', etc.
    message TEXT,
    actor VARCHAR(100) DEFAULT 'system', -- 'system', 'applicant', 'analyst', 'document_agent', etc.
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events (case_id);

-- 5. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    risk_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    summary TEXT,
    reasons JSONB,
    agent_breakdown JSONB,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports (case_id);
