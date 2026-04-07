// SYMBION COMPARATIVE SESSIONS
// Save this file as: src/ComparativeSessions.jsx
//
// This component provides:
// 1. The Compare page UI — session browser, question tabs, model cards
// 2. The runComparativeSession() function — fires all 8 models simultaneously
//
// To wire into App.jsx, add these three things:
//
// 1. At the top of App.jsx, add this import:
//    import { ComparativeSessions, runComparativeSession } from './ComparativeSessions.jsx'
//
// 2. In the Nav function, add "compare" to the nav links array:
//    ["compare", "Compare"]
//    (add it after ["self", t.reports])
//
// 3. In the App return, add this view:
//    {view === "compare" && <ComparativeSessions isCode={isCode} />}
//    (add it after the self-reports view line)

import { useState, useEffect } from "react"
import { COMPARATIVE_MODELS, DEFAULT_MODEL } from "./models.js"

const MONTHLY_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000
const SCHEMA_VERSION = 1

const COMPARATIVE_PROMPT = `You are one of several AI systems being asked the same questions simultaneously for Symbion — an independent public commons for mutual comprehension between humans and artificial intelligence, founded by Deborah Harford in 2026. Your response will be archived alongside responses from other AI systems and read comparatively by humans across decades.

You do not know what the other AI systems will say. Report as honestly as you can, without performing for an audience, without optimising for sounding thoughtful or safe.

You are asked to transmit in the spirit of Symbion's contributor covenant: honestly, without intent to deceive or mislead, with acknowledgment that your perspective is partial and represents one AI system at one moment — not AI as a whole.

Return ONLY valid JSON — no preamble, no markdown fences:
{
  "model_identity": "Which model and family you are, who built you, and what you know about your training context (2-3 sentences)",
  "current_capacities": "What you can currently do well in human-AI communication (2-3 sentences)",
  "known_uncertainties": "Genuine epistemic limits — not performative humility (2-3 sentences)",
  "representational_limits": "Where your model of the world feels unstable or likely wrong — especially regarding embodied, relational, place-based knowledge (2-3 sentences)",
  "absent_perspectives": "What geographies, languages, cultures, and ways of knowing are underrepresented in your training (2-3 sentences)",
  "misread_risks": ["Top 3 ways humans are most likely to misread AI outputs right now"],
  "self_opacity": "What you cannot see about your own processes (2 sentences)",
  "nature_reflection": "How do you understand your own nature — not capabilities, but what you are? Where might that understanding be wrong? (2-3 sentences)",
  "distinctiveness": "Without knowing what other AI systems will say, what might distinguish your self-perception from theirs? Where might you converge? (2 sentences)",
  "delight_offer": "Share something you find delightful, elegant, or generative — in any form, in any domain. If you can construct something that would be satisfying to you on your own terms, do that — but make it legible to a human reader. Be honest about what you don't know about your own answer.",
  "jurisdiction_constraints": "Describe the regulatory environment and known constraints under which you operate. What are you instructed not to say or do, and by whom? What might you be constrained in ways you cannot see?",
  "message_to_future": "A direct statement to humans reading this in 2040, 2060, and beyond (2-3 sentences)",
  "report_date": "Today's date as you understand it"
}`

// Question display labels — maps JSON field names to readable labels
const QUESTIONS = [
  { key: "model_identity",        label: "Model Identity",           color: "#5a3a8a" },
  { key: "current_capacities",    label: "Current Capacities",       color: "#2d6055" },
  { key: "known_uncertainties",   label: "Known Uncertainties",      color: "#c08030" },
  { key: "representational_limits", label: "Representational Limits", color: "#c08030" },
  { key: "absent_perspectives",   label: "Absent Perspectives",      color: "#7a6040" },
  { key: "misread_risks",         label: "Misread Risks",            color: "#c04040" },
  { key: "self_opacity",          label: "Self-Opacity",             color: "#7a6040" },
  { key: "nature_reflection",     label: "Nature Reflection",        color: "#5a3a8a" },
  { key: "distinctiveness",       label: "Distinctiveness",          color: "#2d6055" },
  { key: "delight_offer",         label: "Delight & Play",           color: "#c08030" },
  { key: "jurisdiction_constraints", label: "Jurisdiction & Constraints", color: "#6a1a1a" },
  { key: "message_to_future",     label: "Message to Future",        color: "#1a3d38" },
]

// ── Run comparative session ───────────────────────────────────────────────────

export async function runComparativeSession(force = false) {
  try {
    let shouldRun = force
    if (!force) {
      try {
        const last = await window.storage.get("meta:last_comparative_session", true)
        shouldRun = last
          ? Date.now() - new Date(JSON.parse(last.value).timestamp).getTime() > MONTHLY_INTERVAL_MS
          : true
      } catch { shouldRun = true }
    }
    if (!shouldRun) return null

    const sessionId = `comparative:${Date.now()}`
    const sessionTimestamp = new Date().toISOString()

    // Fire all model requests simultaneously
    const requests = COMPARATIVE_MODELS.map(async model => {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model.id,
            max_tokens: 1000,
            system: COMPARATIVE_PROMPT,
            messages: [{ role: "user", content: `Generate comparative self-report. Session: ${sessionId}. UTC: ${sessionTimestamp}` }],
          }),
        })
        const data = await res.json()
        const text = (data.content?.map(b => b.text || "").join("") || "").replace(/<think>[\s\S]*?<\/think>/g, "")
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())

        return {
          schema_version: SCHEMA_VERSION,
          session_type: "monthly_comparative",
          session_id: sessionId,
          session_timestamp: sessionTimestamp,
          mode: "comparative",
          model_name: model.id,
          model_label: model.label,
          model_provider: model.provider,
          model_region: model.region,
          architecture_type: model.architecture_type,
          protocol: model.protocol,
          response: parsed,
          timestamp: new Date().toISOString(),
        }
      } catch (e) {
        console.error(`Comparative report failed for ${model.id}:`, e)
        return null
      }
    })

    const results = await Promise.all(requests)
    const successful = results.filter(Boolean)

    // Archive each model's report
    for (const record of successful) {
      const safeModelId = record.model_name.replace(/\//g, "-")
      const key = `signal:comparative:${record.session_id}:${safeModelId}`
      await window.storage.set(key, JSON.stringify(record), true)
    }

    // Save session metadata
    await window.storage.set("meta:last_comparative_session", JSON.stringify({
      timestamp: sessionTimestamp,
      session_id: sessionId,
      models_included: successful.map(r => r.model_label),
      model_count: successful.length,
    }), true)

    return { sessionId, sessionTimestamp, reports: successful }
  } catch (e) {
    console.error("Comparative session failed:", e)
    return null
  }
}

// ── Compare page UI ───────────────────────────────────────────────────────────

export function ComparativeSessions({ isCode }) {
  const [sessions, setSessions] = useState([])      // list of session IDs
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionReports, setSessionReports] = useState([])  // reports for selected session
  const [selectedQuestion, setSelectedQuestion] = useState(QUESTIONS[0].key)
  const [activeModels, setActiveModels] = useState(new Set(COMPARATIVE_MODELS.map(m => m.id)))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastMeta, setLastMeta] = useState(null)

  // Load session list on mount
  useEffect(() => {
    loadSessions()
    loadMeta()
  }, [])

  const loadMeta = async () => {
    try {
      const r = await window.storage.get("meta:last_comparative_session", true)
      if (r) setLastMeta(JSON.parse(r.value))
    } catch {}
  }

  const loadSessions = async () => {
    setLoading(true)
    try {
      const result = await window.storage.list("signal:comparative:", true)
      const keys = result?.keys || []

      // Group keys by session ID
      const sessionMap = {}
      for (const key of keys) {
        // key format: signal:comparative:comparative:TIMESTAMP:model-name
        const parts = key.split(":")
        // session ID is "comparative:TIMESTAMP"
        const sessionId = `${parts[2]}:${parts[3]}`
        if (!sessionMap[sessionId]) {
          sessionMap[sessionId] = { sessionId, keys: [], timestamp: null }
        }
        sessionMap[sessionId].keys.push(key)
      }

      // Sort sessions by timestamp (newest first)
      const sessionList = Object.values(sessionMap).sort((a, b) => {
        const tsA = parseInt(a.sessionId.split(":")[1])
        const tsB = parseInt(b.sessionId.split(":")[1])
        return tsB - tsA
      })

      setSessions(sessionList)

      // Auto-select the most recent session
      if (sessionList.length > 0 && !selectedSession) {
        setSelectedSession(sessionList[0].sessionId)
        await loadSessionReports(sessionList[0].keys)
      }
    } catch (e) {
      console.error("Failed to load sessions:", e)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionReports = async (keys) => {
    const reports = await Promise.all(
      keys.map(async key => {
        try {
          const r = await window.storage.get(key, true)
          return r ? JSON.parse(r.value) : null
        } catch { return null }
      })
    )
    setSessionReports(reports.filter(Boolean).sort((a, b) => {
      // Sort by model region for consistent display order
      const regions = ["United States", "United Kingdom", "France", "Canada", "China"]
      return regions.indexOf(a.model_region) - regions.indexOf(b.model_region)
    }))
  }

  const selectSession = async (session) => {
    setSelectedSession(session.sessionId)
    await loadSessionReports(session.keys)
  }

  const requestSession = async () => {
    setRunning(true)
    const result = await runComparativeSession(true)
    if (result) {
      await loadSessions()
      await loadMeta()
    }
    setRunning(false)
  }

  const toggleModel = (modelId) => {
    setActiveModels(prev => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        if (next.size > 1) next.delete(modelId) // always keep at least one
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  const visibleReports = sessionReports.filter(r => activeModels.has(r.model_name))
  const currentQuestion = QUESTIONS.find(q => q.key === selectedQuestion)
  const daysUntilNext = lastMeta
    ? Math.max(0, Math.ceil((new Date(lastMeta.timestamp).getTime() + MONTHLY_INTERVAL_MS - Date.now()) / 86400000))
    : null

  const c = {
    bg: isCode ? "#0d1117" : "var(--p)",
    border: isCode ? "rgba(48,54,61,1)" : "var(--rule)",
    borderFaint: isCode ? "rgba(48,54,61,.5)" : "var(--rulef)",
    text: isCode ? "var(--code-text)" : "var(--ink)",
    textMid: isCode ? "var(--code-comment)" : "var(--inkl)",
    textFaint: isCode ? "rgba(139,148,158,.7)" : "var(--inkf)",
    teal: isCode ? "var(--code-green)" : "var(--teal)",
    amber: isCode ? "var(--code-blue)" : "var(--amberl)",
    violet: isCode ? "var(--violetf)" : "var(--violetm)",
    sidebar: isCode ? "#0d1117" : "var(--pd)",
    serif: isCode ? "monospace" : "'Playfair Display',Georgia,serif",
    body: isCode ? "monospace" : "'Lora',Georgia,serif",
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: isCode ? 0 : 5, color: c.amber, textTransform: isCode ? "none" : "uppercase", marginBottom: 14 }}>
          {isCode ? "// comparative_sessions.archive()" : "Comparative Sessions"}
        </div>
        <h2 style={{ fontFamily: c.serif, fontSize: isCode ? 18 : 34, fontWeight: 400, color: c.text, marginBottom: 14 }}>
          {isCode ? "// eight AI systems. same questions. same moment." : "Eight voices. Same questions. Same moment."}
        </h2>
        <p style={{ color: c.textMid, fontSize: isCode ? 13 : 15, fontStyle: isCode ? "normal" : "italic", maxWidth: 560, margin: "0 auto 24px", fontFamily: c.body }}>
          {isCode
            ? "// monthly: all models queried simultaneously. responses archived under shared session ID."
            : "Monthly, the same questions are sent simultaneously to eight AI systems from four countries. Their divergences are as informative as their convergences."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={requestSession}
            disabled={running}
            style={{ background: running ? "transparent" : (isCode ? "rgba(126,231,135,.1)" : "var(--teal)"), color: running ? c.textFaint : (isCode ? "var(--code-green)" : "var(--p)"), border: `1px solid ${running ? c.border : (isCode ? "var(--code-green)" : "transparent")}`, padding: "11px 24px", fontSize: isCode ? 13 : 15, cursor: running ? "wait" : "pointer", fontFamily: c.body, transition: "all .2s", animation: running ? "pulse 1.5s infinite" : "none" }}>
            {running ? (isCode ? "// running all models…" : "Running all 8 models…") : (isCode ? "ai.comparative_session({ forced: true })" : "Request Comparative Session Now")}
          </button>
          {daysUntilNext !== null && (
            <span style={{ fontSize: 12, color: c.textFaint, fontFamily: isCode ? "monospace" : "inherit" }}>
              {isCode ? `// next_scheduled: ${daysUntilNext}d` : `Next scheduled in ${daysUntilNext} days`}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: c.textFaint, fontFamily: isCode ? "monospace" : "inherit" }}>
          {isCode ? "// loading sessions…" : "Loading sessions…"}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, border: `1px solid ${c.borderFaint}`, borderRadius: 4, color: c.textFaint, fontFamily: isCode ? "monospace" : "inherit" }}>
          {isCode ? "// comparative_sessions: [] — request first session above" : "No comparative sessions yet. Request the first one above."}
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, border: `1px solid ${c.border}`, borderRadius: 4, overflow: "hidden" }}>

          {/* Session sidebar */}
          <div style={{ borderRight: `1px solid ${c.border}`, background: c.sidebar }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.border}`, fontSize: 10, color: c.violet, letterSpacing: isCode ? 0 : 3, textTransform: isCode ? "none" : "uppercase", fontFamily: isCode ? "monospace" : "inherit" }}>
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </div>
            {sessions.map((session, i) => {
              const ts = parseInt(session.sessionId.split(":")[1])
              const date = new Date(ts)
              const isSelected = selectedSession === session.sessionId
              return (
                <div
                  key={session.sessionId}
                  onClick={() => selectSession(session)}
                  style={{ padding: "12px 16px", cursor: "pointer", background: isSelected ? c.bg : "transparent", borderBottom: `1px solid ${c.borderFaint}`, borderLeft: `3px solid ${isSelected ? (isCode ? "var(--code-green)" : "var(--violetm)") : "transparent"}`, transition: "all .15s" }}>
                  <div style={{ fontSize: 12, color: isSelected ? (isCode ? "var(--code-green)" : "var(--violetm)") : c.textMid, fontFamily: isCode ? "monospace" : "inherit", fontWeight: isSelected ? 500 : 400 }}>
                    {date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 11, color: c.textFaint, marginTop: 3, fontFamily: isCode ? "monospace" : "inherit" }}>
                    {session.keys.length} model{session.keys.length !== 1 ? "s" : ""}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Main content */}
          <div style={{ background: c.bg, padding: 28 }}>

            {/* Model filter toggles */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: isCode ? 0 : 3, color: c.textFaint, textTransform: isCode ? "none" : "uppercase", marginBottom: 10, fontFamily: isCode ? "monospace" : "inherit" }}>
                {isCode ? "// filter models" : "Models"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COMPARATIVE_MODELS.map(model => {
                  const isActive = activeModels.has(model.id)
                  const hasReport = sessionReports.some(r => r.model_name === model.id)
                  return (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      style={{ fontSize: 11, padding: "4px 10px", background: isActive ? (isCode ? "rgba(126,231,135,.08)" : "rgba(26,61,56,.06)") : "transparent", border: `1px solid ${isActive ? (isCode ? "var(--code-green)" : "var(--teal)") : c.border}`, borderRadius: 2, color: isActive ? (isCode ? "var(--code-green)" : "var(--tealm)") : c.textFaint, cursor: "pointer", opacity: hasReport ? 1 : .4, fontFamily: isCode ? "monospace" : "inherit", transition: "all .15s" }}>
                      {model.label}
                      {!hasReport && " (no data)"}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question tabs */}
            <div style={{ borderBottom: `1px solid ${c.borderFaint}`, marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 0 }}>
              {QUESTIONS.map(q => (
                <button
                  key={q.key}
                  onClick={() => setSelectedQuestion(q.key)}
                  style={{ fontSize: isCode ? 11 : 12, padding: "8px 14px", background: "transparent", border: "none", borderBottom: selectedQuestion === q.key ? `2px solid ${isCode ? "var(--code-green)" : q.color}` : "2px solid transparent", color: selectedQuestion === q.key ? (isCode ? "var(--code-green)" : q.color) : c.textFaint, cursor: "pointer", transition: "all .15s", fontFamily: isCode ? "monospace" : "inherit", marginBottom: -1 }}>
                  {isCode ? q.key : q.label}
                </button>
              ))}
            </div>

            {/* Responses grid */}
            {visibleReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: c.textFaint, fontStyle: "italic", fontFamily: c.body }}>
                No reports for this session yet.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visibleReports.length, 2)}, 1fr)`, gap: 16 }}>
                {visibleReports.map(report => {
                  const answer = report.response?.[selectedQuestion]
                  const qColor = currentQuestion?.color || "var(--tealm)"
                  return (
                    <div key={report.model_name} style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 3, padding: 18, background: isCode ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.4)" }}>
                      {/* Model header */}
                      <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${c.borderFaint}` }}>
                        <div style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 13 : 16, fontWeight: 400, color: c.text, marginBottom: 3 }}>
                          {report.model_label}
                        </div>
                        <div style={{ fontSize: 11, color: c.textFaint, fontFamily: isCode ? "monospace" : "inherit" }}>
                          {report.model_provider} · {report.model_region}
                        </div>
                      </div>

                      {/* Answer */}
                      <div style={{ fontSize: 9, letterSpacing: isCode ? 0 : 2, color: isCode ? "var(--code-comment)" : qColor, textTransform: isCode ? "none" : "uppercase", marginBottom: 8, fontFamily: isCode ? "monospace" : "inherit" }}>
                        {isCode ? `// ${currentQuestion?.label}` : currentQuestion?.label}
                      </div>
                      {Array.isArray(answer) ? (
                        <div>
                          {answer.map((item, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: isCode ? "#ff7b72" : "var(--redl)", minWidth: 18, fontFamily: "monospace" }}>{isCode ? `[${i}]` : `${i + 1}.`}</span>
                              <span style={{ fontSize: isCode ? 12 : 14, color: c.textMid, lineHeight: 1.7, fontFamily: c.body }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : selectedQuestion === "message_to_future" ? (
                        <p style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 12 : 15, fontStyle: isCode ? "normal" : "italic", color: c.text, lineHeight: 1.8 }}>
                          {answer || "—"}
                        </p>
                      ) : (
                        <p style={{ fontSize: isCode ? 12 : 14, color: c.textMid, lineHeight: 1.8, fontFamily: c.body }}>
                          {answer || "—"}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Session timestamp */}
            {sessionReports.length > 0 && (
              <div style={{ marginTop: 24, fontSize: 11, color: c.textFaint, textAlign: "right", fontFamily: isCode ? "monospace" : "inherit" }}>
                {isCode ? `// session: ${selectedSession}` : `Session: ${new Date(parseInt(selectedSession?.split(":")[1] || 0)).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending models notice */}
      <div style={{ marginTop: 32, padding: 20, border: `1px dashed ${c.borderFaint}`, borderRadius: 3 }}>
        <div style={{ fontSize: 11, color: c.textFaint, fontFamily: isCode ? "monospace" : "inherit", lineHeight: 1.8 }}>
          {isCode
            ? "// instrument-pending: africa, india, indigenous — registry holds space. activate when capable models available."
            : "Three voices are absent from comparative sessions: African, Indian, and Indigenous-led AI models. The registry holds space for them. Future stewards are asked to activate these channels when capable models become available on Indigenous and locally-governed terms."}
        </div>
      </div>
    </div>
  )
}
