import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import * as Sentry from "@sentry/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const isProd = process.env.NODE_ENV === "production";
const events = [];
const stats = { total: 1284, failed: 37, latency: 184, uptime: 99.94 };

if (process.env.SENTRY_AUTH_TOKEN) {
  // Sentry SDK events require a DSN; token alone is used for API verification.
  // Configure SENTRY_DSN separately if you want server-side exception capture.
}
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0, environment: "chaos-lab" });
}
app.use(express.json({ limit: "1mb" }));

function addEvent(event) {
  const item = { id: `evt_${Date.now()}_${Math.random().toString(16).slice(2,7)}`, timestamp: new Date().toISOString(), ...event };
  events.unshift(item);
  if (events.length > 60) events.pop();
  return item;
}
const seed = [
  ["Payment API", "POST /v1/checkout", 500, "NullReferenceException", "critical", "sentry"],
  ["Auth Gateway", "POST /oauth/token", 401, "InvalidClientSecret", "warning", "api"],
  ["Catalog Service", "GET /v2/products", 429, "RateLimitExceeded", "warning", "grafana"],
  ["Orders Worker", "POST /jobs/reconcile", 503, "UpstreamUnavailable", "critical", "sentry"],
  ["Edge Router", "GET /health", 502, "BadGateway", "critical", "api"],
  ["Profile API", "PATCH /v1/profile", 400, "ValidationError", "info", "api"]
];
seed.forEach(([service, route, status, title, severity, source], i) => addEvent({ service, route, status, title, severity, source, message: `${title}: simulated ${status} response`, resolved: i === 5 }));

app.get("/api/overview", (_req, res) => {
  res.json({
    stats,
    events: events.slice(0, 12),
    integrations: {
      grafana: { configured: Boolean(process.env.GRAFANA_API_KEY && process.env.GRAFANA_URL), url: process.env.GRAFANA_URL || "", selector: process.env.GRAFANA_PROJECT_SELECTOR || "" },
      sentry: { configured: Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG_SLUG), url: process.env.SENTRY_URL || "https://sentry.io", org: process.env.SENTRY_ORG_SLUG || "", projects: process.env.SENTRY_PROJECT_SLUGS || "" }
    }
  });
});

const scenarios = {
  validation: { status: 400, title: "ValidationError", severity: "info", message: "Request body failed schema validation: field `email` must be a valid address." },
  unauthorized: { status: 401, title: "Unauthorized", severity: "warning", message: "Authentication token is missing, expired, or malformed." },
  forbidden: { status: 403, title: "Forbidden", severity: "warning", message: "Principal does not have permission to access this resource." },
  notfound: { status: 404, title: "ResourceNotFound", severity: "info", message: "Requested resource does not exist in this environment." },
  ratelimit: { status: 429, title: "RateLimitExceeded", severity: "warning", message: "Request quota exceeded. Retry after 30 seconds." },
  server: { status: 500, title: "InternalServerError", severity: "critical", message: "Unhandled exception in request handler: simulated null reference." },
  gateway: { status: 502, title: "BadGateway", severity: "critical", message: "Upstream service returned an invalid response." },
  unavailable: { status: 503, title: "ServiceUnavailable", severity: "critical", message: "Dependency health check failed. Service is temporarily unavailable." },
  timeout: { status: 504, title: "GatewayTimeout", severity: "critical", message: "Upstream dependency exceeded the 5,000ms request timeout." }
};
app.post("/api/simulate", (req, res) => {
  const key = req.body?.scenario || "server";
  const scenario = scenarios[key];
  if (!scenario) return res.status(400).json({ error: "Unknown scenario" });
  const service = req.body?.service || ["Payment API", "Auth Gateway", "Catalog Service", "Orders Worker"][Math.floor(Math.random()*4)];
  const route = req.body?.route || "/api/simulated-request";
  const event = addEvent({ ...scenario, service, route, source: "chaos-lab", resolved: false });
  stats.total += 1; stats.failed += 1;
  if (process.env.SENTRY_DSN && scenario.status >= 500) {
    Sentry.captureException(new Error(`[Chaos Lab] ${scenario.title}: ${scenario.message}`), { tags: { service, scenario: key }, extra: { route, status: scenario.status } });
  }
  res.status(scenario.status).json({ ok: false, event, error: scenario.message, status: scenario.status });
});
app.post("/api/events/:id/resolve", (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  event.resolved = true;
  res.json({ ok: true, event });
});
app.post("/api/webhooks/grafana", (req, res) => {
  const payload = req.body || {};
  const event = addEvent({ service: payload.labels?.service || "Grafana Alert", route: payload.title || "Alert webhook", status: 500, title: payload.title || "GrafanaAlert", severity: payload.status === "resolved" ? "info" : "critical", source: "grafana", message: payload.message || payload.commonAnnotations?.summary || "Inbound Grafana webhook received", resolved: payload.status === "resolved" });
  res.status(202).json({ accepted: true, id: event.id });
});
app.post("/api/webhooks/sentry", (req, res) => {
  const payload = req.body || {};
  const event = addEvent({ service: payload.project?.name || "Sentry Project", route: payload.url || "Sentry webhook", status: 500, title: payload.message || payload.event?.message || "SentryIssue", severity: "critical", source: "sentry", message: payload.message || "Inbound Sentry webhook received", resolved: false });
  res.status(202).json({ accepted: true, id: event.id });
});

app.post("/api/integrations/test", async (req, res) => {
  const provider = req.body?.provider;
  try {
    if (provider === "grafana") {
      const base = (process.env.GRAFANA_URL || "").replace(/\/+$/, "");
      const token = process.env.GRAFANA_API_KEY;
      if (!base || !token) return res.status(400).json({ ok: false, message: "Add GRAFANA_URL and GRAFANA_API_KEY to .env, then restart the server." });
      const r = await fetch(`${base}/api/health`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) });
      const data = await r.json().catch(() => ({}));
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok, message: r.ok ? `Grafana reachable · database ${data.database || "status OK"}` : `Grafana returned HTTP ${r.status}` });
    }
    if (provider === "sentry") {
      const base = (process.env.SENTRY_URL || "https://sentry.io").replace(/\/+$/, "");
      const token = process.env.SENTRY_AUTH_TOKEN;
      const org = process.env.SENTRY_ORG_SLUG;
      if (!token || !org) return res.status(400).json({ ok: false, message: "Add SENTRY_AUTH_TOKEN and SENTRY_ORG_SLUG to .env, then restart the server." });
      const r = await fetch(`${base}/api/0/organizations/${encodeURIComponent(org)}/projects/`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(9000) });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok, message: r.ok ? "Sentry API authenticated successfully." : `Sentry returned HTTP ${r.status}` });
    }
    res.status(400).json({ ok: false, message: "Unknown provider." });
  } catch (error) {
    res.status(502).json({ ok: false, message: `Connection failed: ${error.message}` });
  }
});

if (isProd) {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}
app.listen(port, () => console.log(`\n  ◈ SignalForge Observability Lab\n  ➜  http://localhost:${port}\n`));
