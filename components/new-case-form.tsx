"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createCase, addDocument, runInvestigation } from "@/lib/actions"
import { DOC_TYPES, DOC_TYPE_LABELS, type DocType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Upload, Check, Loader2, Sparkles, X } from "lucide-react"

type Applicant = {
  applicant_name: string
  date_of_birth: string
  id_type: string
  id_number: string
  phone: string
  email: string
  address: string
  declared_salary: string
}

type UploadedFile = { pathname: string; contentType: string; fileSize: number; fileName: string }
type DocEntry = {
  doc_type: DocType
  file_name: string
  content_summary: string
  checked: boolean
  uploading: boolean
  uploaded?: UploadedFile
}

const PRESETS: Record<string, { label: string; applicant: Applicant; docs: DocType[] }> = {
  clean: {
    label: "Genuine applicant (low risk)",
    applicant: {
      applicant_name: "Rohan Mehta",
      date_of_birth: "1990-04-12",
      id_type: "pan",
      id_number: "ABCPM1234K",
      phone: "+91 98200 11223",
      email: "rohan.mehta@infotechcorp.com",
      address: "14 Linking Road, Bandra West, Mumbai 400050",
      declared_salary: "95000",
    },
    docs: ["pan", "selfie", "bank_statement"],
  },
  synthetic: {
    label: "Synthetic identity (high risk)",
    applicant: {
      applicant_name: "Arjun Verma",
      date_of_birth: "1995-09-30",
      id_type: "pan",
      id_number: "ZZ123AA",
      phone: "+91 70000 00001",
      email: "arjun9921@mailinator.com",
      address: "Flat 9, Sector 21, Gurugram",
      declared_salary: "180000",
    },
    docs: ["pan", "selfie", "bank_statement"],
  },
  missing: {
    label: "Missing PAN (exception flow)",
    applicant: {
      applicant_name: "Neha Kapoor",
      date_of_birth: "1992-01-08",
      id_type: "pan",
      id_number: "",
      phone: "+91 99100 44556",
      email: "neha.kapoor@gmail.com",
      address: "22 MG Road, Pune 411001",
      declared_salary: "60000",
    },
    docs: ["selfie", "bank_statement"],
  },
}

export function NewCaseForm() {
  const router = useRouter()
  const [applicant, setApplicant] = useState<Applicant>(PRESETS.synthetic.applicant)
  const [docs, setDocs] = useState<DocEntry[]>(
    DOC_TYPES.map((t) => ({
      doc_type: t,
      file_name: "",
      content_summary: "",
      checked: PRESETS.synthetic.docs.includes(t),
      uploading: false,
    })),
  )
  const [submitting, setSubmitting] = useState(false)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  function applyPreset(key: string) {
    const p = PRESETS[key]
    setApplicant(p.applicant)
    setDocs(
      DOC_TYPES.map((t) => ({
        doc_type: t,
        file_name: p.docs.includes(t) ? `${t}_${p.applicant.applicant_name.split(" ")[0].toLowerCase()}.pdf` : "",
        content_summary: "",
        checked: p.docs.includes(t),
        uploading: false,
      })),
    )
  }

  function update<K extends keyof Applicant>(key: K, value: string) {
    setApplicant((a) => ({ ...a, [key]: value }))
  }

  function toggleDoc(type: DocType, checked: boolean) {
    setDocs((d) =>
      d.map((x) =>
        x.doc_type === type ? { ...x, checked, file_name: checked && !x.file_name ? `${type}.pdf` : x.file_name } : x,
      ),
    )
  }

  async function handleFile(type: DocType, file: File | undefined) {
    if (!file) return
    setDocs((d) => d.map((x) => (x.doc_type === type ? { ...x, uploading: true, checked: true } : x)))
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("doc_type", type)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("upload failed")
      const data = (await res.json()) as UploadedFile
      setDocs((d) =>
        d.map((x) =>
          x.doc_type === type
            ? { ...x, uploading: false, uploaded: data, file_name: data.fileName }
            : x,
        ),
      )
    } catch (err) {
      console.log("[v0] file upload failed:", (err as Error).message)
      setDocs((d) => d.map((x) => (x.doc_type === type ? { ...x, uploading: false } : x)))
    }
  }

  function clearFile(type: DocType) {
    setDocs((d) => d.map((x) => (x.doc_type === type ? { ...x, uploaded: undefined, file_name: "" } : x)))
    const input = fileInputs.current[type]
    if (input) input.value = ""
  }

  async function handleSubmit(runNow: boolean) {
    setSubmitting(true)
    try {
      const id = await createCase({
        applicant_name: applicant.applicant_name,
        date_of_birth: applicant.date_of_birth || undefined,
        id_type: applicant.id_type || undefined,
        id_number: applicant.id_number || undefined,
        phone: applicant.phone || undefined,
        email: applicant.email || undefined,
        address: applicant.address || undefined,
        declared_salary: applicant.declared_salary ? Number(applicant.declared_salary) : undefined,
      })
      for (const d of docs.filter((x) => x.checked)) {
        await addDocument({
          case_id: id,
          doc_type: d.doc_type,
          file_name: d.file_name || `${d.doc_type}.pdf`,
          content_summary: d.content_summary || undefined,
          blob_pathname: d.uploaded?.pathname,
          content_type: d.uploaded?.contentType,
          file_size: d.uploaded?.fileSize,
        })
      }
      if (runNow) {
        await runInvestigation(id)
      }
      router.push(`/cases/${id}`)
    } catch (err) {
      console.log("[v0] submit failed:", (err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applicant Details</CardTitle>
            <CardDescription>KYC information submitted by the applicant during onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={applicant.applicant_name} onChange={(e) => update("applicant_name", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={applicant.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="salary">Declared monthly salary (₹)</Label>
              <Input id="salary" inputMode="numeric" value={applicant.declared_salary} onChange={(e) => update("declared_salary", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="idtype">ID type</Label>
              <Select value={applicant.id_type} onValueChange={(v) => update("id_type", v ?? "")}>
                <SelectTrigger id="idtype">
                  <SelectValue placeholder="Select ID" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="pan">PAN</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="idnum">ID number</Label>
              <Input id="idnum" value={applicant.id_number} onChange={(e) => update("id_number", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={applicant.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={applicant.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" rows={2} value={applicant.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Upload</CardTitle>
            <CardDescription>
              Upload real images (JPG/PNG) or PDFs. Uploaded ID and selfie images are analyzed live by the vision-based
              agents; unselected items are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {docs.map((d) => (
              <div
                key={d.doc_type}
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => toggleDoc(d.doc_type, !d.checked)}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    d.checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"
                  }`}
                  aria-pressed={d.checked}
                  aria-label={`Toggle ${DOC_TYPE_LABELS[d.doc_type]}`}
                >
                  {d.checked ? <Check className="size-4" /> : <Upload className="size-4" />}
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">{DOC_TYPE_LABELS[d.doc_type]}</span>
                </div>
                <input
                  ref={(el) => {
                    fileInputs.current[d.doc_type] = el
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(d.doc_type, e.target.files?.[0])}
                />
                <div className="flex items-center gap-2 sm:w-[220px]">
                  {d.uploading ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Uploading…
                    </span>
                  ) : d.uploaded ? (
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-risk-low">
                      <Check className="size-3.5 shrink-0" />
                      <span className="truncate">{d.uploaded.fileName}</span>
                      <button
                        type="button"
                        onClick={() => clearFile(d.doc_type)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove file"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputs.current[d.doc_type]?.click()}
                    >
                      <Upload className="size-3.5" /> Choose file
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> Demo Presets
            </CardTitle>
            <CardDescription>Load a realistic scenario to showcase the workflow.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <Button key={key} type="button" variant="outline" className="justify-start" onClick={() => applyPreset(key)}>
                {p.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="text-base">Submit Case</CardTitle>
            <CardDescription>Create the case file, then orchestrate the agent pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => handleSubmit(true)} disabled={submitting || !applicant.applicant_name}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Create & Run Investigation
            </Button>
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={submitting || !applicant.applicant_name}>
              Create case only
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Running the investigation triggers all five agents through the Maestro stages and produces a fraud risk report.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
