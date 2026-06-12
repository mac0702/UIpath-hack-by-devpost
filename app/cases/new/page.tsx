import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { NewCaseForm } from "@/components/new-case-form"
import { ArrowLeft } from "lucide-react"

export default function NewCasePage() {
  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">New Fraud Investigation Case</h1>
        <p className="mb-6 mt-1 max-w-2xl text-sm text-muted-foreground">
          Capture the applicant&apos;s KYC submission and uploaded documents. Sentinel will orchestrate document, identity,
          financial, and decision agents to produce a fraud risk score.
        </p>
        <NewCaseForm />
      </div>
    </main>
  )
}
