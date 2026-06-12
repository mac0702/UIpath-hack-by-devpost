import type { CaseEventRow } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function dotColor(eventType: string) {
  if (eventType === "exception") return "bg-risk-high"
  if (eventType === "assigned" || eventType === "request_documents") return "bg-risk-medium"
  if (eventType === "approved" || eventType === "auto_decision" || eventType === "closed") return "bg-risk-low"
  if (eventType === "rejected") return "bg-risk-high"
  return "bg-primary"
}

export function EventTimeline({ events }: { events: CaseEventRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orchestration Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotColor(e.event_type))} />
                {i < events.length - 1 && <span className="w-px flex-1 bg-border" />}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm">{e.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{e.actor}</span> ·{" "}
                  {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
