import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET handler: Allows UiPath to poll for pending investigations
 * Query parameters:
 *  - action: 'get-cases'
 *  - stage: optional filter (e.g. 'case_created')
 *  - status: optional filter (e.g. 'created')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "get-cases") {
      const stage = searchParams.get("stage")
      const status = searchParams.get("status")

      let query
      if (stage && status) {
        query = await sql`SELECT * FROM cases WHERE current_stage = ${stage} AND status = ${status} ORDER BY created_at ASC`
      } else if (stage) {
        query = await sql`SELECT * FROM cases WHERE current_stage = ${stage} ORDER BY created_at ASC`
      } else if (status) {
        query = await sql`SELECT * FROM cases WHERE status = ${status} ORDER BY created_at ASC`
      } else {
        query = await sql`SELECT * FROM cases ORDER BY created_at DESC LIMIT 50`
      }

      return NextResponse.json({ success: true, cases: query })
    }

    return NextResponse.json({ error: "Invalid action or action not specified" }, { status: 400 })
  } catch (error) {
    console.error("[UiPath API Error] GET:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

/**
 * POST handler: Receives callbacks and updates from UiPath processes
 * Body parameter fields:
 *  - action: 'update-stage' | 'add-agent-output' | 'add-event' | 'create-report' | 'close-case'
 *  - caseId: UUID of the target case
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, caseId } = body

    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 })
    }

    // 1. Update case execution stage
    if (action === "update-stage") {
      const { stage, status } = body
      if (!stage) return NextResponse.json({ error: "Missing stage" }, { status: 400 })

      if (status) {
        await sql`UPDATE cases SET current_stage = ${stage}, status = ${status}, updated_at = now() WHERE id = ${caseId}`
      } else {
        await sql`UPDATE cases SET current_stage = ${stage}, updated_at = now() WHERE id = ${caseId}`
      }

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor)
        VALUES (${caseId}, ${stage}, 'stage_start', ${`UiPath Maestro: transitioning to ${stage}`}, 'uipath_maestro')
      `
      return NextResponse.json({ success: true, message: `Stage updated to ${stage}` })
    }

    // 2. Add an agent output (e.g. OCR, Face, Financial analysis results)
    if (action === "add-agent-output") {
      const { agent, stage, status, score, result, reasons } = body
      if (!agent || !stage || !status) {
        return NextResponse.json({ error: "Missing agent, stage, or status" }, { status: 400 })
      }

      await sql`
        INSERT INTO agent_outputs (case_id, agent, stage, status, score, result, reasons)
        VALUES (${caseId}, ${agent}, ${stage}, ${status}, ${score ?? null}, ${result ? JSON.stringify(result) : null}, ${reasons ? JSON.stringify(reasons) : null})
      `

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor, metadata)
        VALUES (${caseId}, ${stage}, 'agent_complete', ${reasons?.[0] ?? `${agent} complete`}, ${agent}, ${score !== undefined ? JSON.stringify({ riskScore: score }) : null})
      `
      return NextResponse.json({ success: true, message: `Agent output recorded for ${agent}` })
    }

    // 3. Log a generic orchestration event
    if (action === "add-event") {
      const { stage, eventType, message, actor, metadata } = body
      if (!stage || !eventType || !message) {
        return NextResponse.json({ error: "Missing stage, eventType, or message" }, { status: 400 })
      }

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor, metadata)
        VALUES (${caseId}, ${stage}, ${eventType}, ${message}, ${actor ?? "uipath_robot"}, ${metadata ? JSON.stringify(metadata) : null})
      `
      return NextResponse.json({ success: true, message: "Event logged successfully" })
    }

    // 4. Create the final investigation risk report
    if (action === "create-report") {
      const { riskScore, riskLevel, summary, reasons, agentBreakdown, recommendation } = body
      if (riskScore === undefined || !riskLevel) {
        return NextResponse.json({ error: "Missing riskScore or riskLevel" }, { status: 400 })
      }

      await sql`
        INSERT INTO reports (case_id, risk_score, risk_level, summary, reasons, agent_breakdown, recommendation)
        VALUES (${caseId}, ${riskScore}, ${riskLevel}, ${summary ?? null}, ${reasons ? JSON.stringify(reasons) : null}, ${agentBreakdown ? JSON.stringify(agentBreakdown) : null}, ${recommendation ?? null})
      `

      await sql`
        UPDATE cases 
        SET risk_score = ${riskScore}, risk_level = ${riskLevel}, updated_at = now() 
        WHERE id = ${caseId}
      `

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor)
        VALUES (${caseId}, 'risk_assessment', 'report_ready', ${`Risk report finalized: Score ${riskScore} (${riskLevel})`}, 'uipath_maestro')
      `
      return NextResponse.json({ success: true, message: "Risk report created successfully" })
    }

    // 5. Finalize the case decision
    if (action === "close-case") {
      const { decision, note, analyst } = body
      if (!decision) return NextResponse.json({ error: "Missing decision" }, { status: 400 })

      await sql`
        UPDATE cases 
        SET decision = ${decision}, status = ${decision === "rejected" ? "rejected" : "approved"}, current_stage = 'case_closed', updated_at = now() 
        WHERE id = ${caseId}
      `

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor)
        VALUES (${caseId}, 'decision', ${decision === "rejected" ? "rejected" : "approved"}, ${note ?? `Case finalized as ${decision}`}, ${analyst ?? "uipath_maestro"})
      `

      await sql`
        INSERT INTO case_events (case_id, stage, event_type, message, actor)
        VALUES (${caseId}, 'case_closed', 'closed', 'Case closed', ${analyst ?? "uipath_maestro"})
      `
      return NextResponse.json({ success: true, message: "Case closed successfully" })
    }

    return NextResponse.json({ error: "Invalid action or action not specified" }, { status: 400 })
  } catch (error) {
    console.error("[UiPath API Error] POST:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
