import { get } from "@vercel/blob"
import fs from "node:fs/promises"
import path from "node:path"

/**
 * Read a private blob and return it as a base64 data URL suitable for
 * passing to a vision-capable model (via the AI SDK `image` content part).
 * Returns null on any failure so agents can fall back to text reasoning.
 */
export async function readBlobAsDataUrl(
  pathname: string | null,
): Promise<{ dataUrl: string; contentType: string } | null> {
  if (!pathname) return null
  try {
    // Read from local storage if it's a fallback upload path
    if (pathname.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", pathname)
      const buffer = await fs.readFile(filePath)
      const base64 = buffer.toString("base64")
      
      let contentType = "image/jpeg"
      if (pathname.endsWith(".png")) contentType = "image/png"
      else if (pathname.endsWith(".pdf")) contentType = "application/pdf"
      
      return { dataUrl: `data:${contentType};base64,${base64}`, contentType }
    }

    const result = await get(pathname, { access: "private" })
    if (!result || !result.stream) return null

    const arrayBuffer = await new Response(result.stream).arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const contentType = result.blob.contentType || "image/jpeg"
    return { dataUrl: `data:${contentType};base64,${base64}`, contentType }
  } catch (err) {
    console.log("[v0] readBlobAsDataUrl failed:", (err as Error).message)
    return null
  }
}

export function isImage(contentType: string | null | undefined) {
  return !!contentType && contentType.startsWith("image/")
}

