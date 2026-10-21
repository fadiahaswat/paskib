import { Hono } from "npm:hono"
import { cors } from "npm:hono/cors"
import { logger } from "npm:hono/logger"
import * as kv from "./kv_store.tsx"

const app = new Hono()
const BASE = "/make-server-5a37434d"

// Enable logger
app.use("*", logger(console.log))

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
)

// Health check endpoint
app.get(`${BASE}/health`, (c) => {
  return c.json({
    status: "ok",
    service: "paska-track-server",
    timestamp: new Date().toISOString(),
  })
})

// Full application state snapshot sync
app.get(`${BASE}/state`, async (c) => {
  try {
    const keys = [
      "paska:candidates",
      "paska:sessions",
      "paska:records",
      "paska:schedules",
      "paska:questions",
      "paska:announcements",
      "paska:standards",
      "paska:users",
      "paska:audit",
      "paska:checklists",
    ]
    const values = await kv.mget(keys)
    return c.json({
      status: "ok",
      data: {
        candidates: values[0] ?? null,
        sessions: values[1] ?? null,
        records: values[2] ?? null,
        schedules: values[3] ?? null,
        questions: values[4] ?? null,
        announcements: values[5] ?? null,
        standards: values[6] ?? null,
        users: values[7] ?? null,
        audit: values[8] ?? null,
        checklists: values[9] ?? null,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to load state",
      },
      500,
    )
  }
})

app.put(`${BASE}/state`, async (c) => {
  try {
    const body = await c.req.json()
    const keys: string[] = []
    const values: unknown[] = []

    const allowedCollections = [
      "candidates",
      "sessions",
      "records",
      "schedules",
      "questions",
      "announcements",
      "standards",
      "users",
      "audit",
      "checklists",
    ]

    for (const col of allowedCollections) {
      if (body[col] !== undefined) {
        keys.push(`paska:${col}`)
        values.push(body[col])
      }
    }

    if (keys.length > 0) {
      await kv.mset(keys, values)
    }

    return c.json({
      status: "ok",
      updated: keys,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to save state",
      },
      500,
    )
  }
})

// Generic collection CRUD endpoints
app.get(`${BASE}/collection/:name`, async (c) => {
  try {
    const name = c.req.param("name")
    const data = await kv.get(`paska:${name}`)
    return c.json({ status: "ok", data: data ?? null })
  } catch (error) {
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch collection",
      },
      500,
    )
  }
})

app.put(`${BASE}/collection/:name`, async (c) => {
  try {
    const name = c.req.param("name")
    const payload = await c.req.json()
    await kv.set(`paska:${name}`, payload.data ?? payload)
    return c.json({
      status: "ok",
      collection: name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update collection",
      },
      500,
    )
  }
})

Deno.serve(app.fetch)
