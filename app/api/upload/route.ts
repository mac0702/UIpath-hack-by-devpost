import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

// Upload a KYC document to private Blob storage, falling back to local files.
// Returns the pathname (used later to re-read the file for OCR/vision analysis).
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const docType = (formData.get("doc_type") as string) || "document"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const uniqueName = `${Date.now()}-${safeName}`

    // Fallback to local storage if Vercel token is missing
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const uploadDir = path.join(process.cwd(), "public", "uploads")
      await fs.mkdir(uploadDir, { recursive: true })
      
      const filePath = path.join(uploadDir, uniqueName)
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)

      return NextResponse.json({
        pathname: `/uploads/${uniqueName}`,
        contentType: file.type,
        fileSize: file.size,
        fileName: file.name,
      })
    }

    const blob = await put(`kyc/${docType}/${uniqueName}`, file, {
      access: "private",
    })

    return NextResponse.json({
      pathname: blob.pathname,
      contentType: file.type,
      fileSize: file.size,
      fileName: file.name,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

