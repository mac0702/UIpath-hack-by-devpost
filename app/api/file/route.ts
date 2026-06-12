import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import fs from "node:fs/promises"
import path from "node:path"

// Serve a private KYC document. In production, add analyst auth here.
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname")
    if (!pathname) {
      return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
    }

    // Serve from local public folder if it's a local fallback upload
    if (pathname.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", pathname)
      try {
        const fileBuffer = await fs.readFile(filePath)
        
        let contentType = "application/octet-stream"
        if (pathname.endsWith(".png")) contentType = "image/png"
        else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) contentType = "image/jpeg"
        else if (pathname.endsWith(".pdf")) contentType = "application/pdf"

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, no-cache",
          },
        })
      } catch (err) {
        return new NextResponse("File not found", { status: 404 })
      }
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] Error serving file:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}

