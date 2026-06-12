import { neon } from "@neondatabase/serverless"

let client: ReturnType<typeof neon> | null = null

export const sql = ((strings: TemplateStringsArray, ...values: any[]) => {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set. Please set it in your environment.")
    }
    client = neon(process.env.DATABASE_URL)
  }
  return client(strings, ...values)
}) as unknown as ReturnType<typeof neon>

