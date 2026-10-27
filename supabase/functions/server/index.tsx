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
      "paska:catTryoutAttempts",
      "paska:cycles",
      "paska:activeCycleId",
      "paska:rankingPublished",
      "paska:ishiharaSessions",
      "paska:ishiharaAllowlist",
      "paska:ishiharaResults",
    ]
    const values = await Promise.all(keys.map((k) => kv.get(k)))
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
        catTryoutAttempts: values[10] ?? null,
        cycles: values[11] ?? null,
        activeCycleId: values[12] ?? null,
        rankingPublished: values[13] ?? null,
        ishiharaSessions: values[14] ?? null,
        ishiharaAllowlist: values[15] ?? null,
        ishiharaResults: values[16] ?? null,
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
    const deletedIds = new Set<string>(
      Array.isArray(body.deletedCandidateIds) ? body.deletedCandidateIds : [],
    )

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
      "catTryoutAttempts",
      "cycles",
      "activeCycleId",
      "rankingPublished",
      "ishiharaSessions",
      "ishiharaAllowlist",
      "ishiharaResults",
    ]

    for (const col of allowedCollections) {
      if (body[col] !== undefined) {
        let nextVal = body[col]
        if (col === "candidates" && Array.isArray(nextVal)) {
          const existing = await kv.get("paska:candidates")
          if (Array.isArray(existing)) {
            const byId = new Map<string, any>()
            for (const item of existing) {
              if (item?.id && !deletedIds.has(item.id)) {
                byId.set(item.id, item)
              }
            }
            for (const inc of nextVal) {
              if (!inc?.id || deletedIds.has(inc.id)) continue
              const prev = byId.get(inc.id)
              if (prev) {
                byId.set(inc.id, {
                  ...prev,
                  ...inc,
                  pip: inc.pip ?? prev.pip ?? null,
                  tiu: inc.tiu ?? prev.tiu ?? null,
                })
              } else {
                byId.set(inc.id, inc)
              }
            }
            nextVal = Array.from(byId.values())
          }
        } else if (col === "catTryoutAttempts" && Array.isArray(nextVal)) {
          const existing = await kv.get("paska:catTryoutAttempts")
          if (Array.isArray(existing)) {
            const byId = new Map<string, any>()
            for (const item of existing) {
              if (item?.id) byId.set(item.id, item)
            }
            for (const inc of nextVal) {
              if (!inc?.id) continue
              const prev = byId.get(inc.id)
              byId.set(inc.id, prev ? { ...prev, ...inc } : inc)
            }
            nextVal = Array.from(byId.values())
          }
        }
        keys.push(`paska:${col}`)
        values.push(nextVal)
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
