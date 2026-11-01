# SignalForge — Observability Chaos Lab

A standalone React + Express sandbox designed to exercise the Grafana and Sentry integrations shown in your screenshots. It is separate from your main IDP repo and has no database.

## What it includes
- Futuristic dark observability dashboard with request/error charts, service health, and event stream.
- Error Lab: trigger realistic HTTP 400, 401, 403, 404, 429, 500, 502, 503, and 504 responses.
- Event details drawer and resolve action.
- Grafana and Sentry credential status and live **Test connection** actions.
- Inbound webhook receivers:
  - `POST /api/webhooks/grafana`
  - `POST /api/webhooks/sentry`
- Server-side-only credentials. Secrets are never sent to the React client.
- Optional Sentry SDK exception capture when `SENTRY_DSN` is supplied.
- In-memory events only; restarting clears the event stream. No database.

## Run it
Prerequisite: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:4173. The app and API run together in **one terminal and one process**. There is no second terminal or database.

## Credentials
The root `.env` is pre-created. Add your actual values there, then restart `npm run dev`.

```dotenv
GRAFANA_URL=https://your-stack.grafana.net
GRAFANA_API_KEY=glsa_your_real_token
GRAFANA_PROJECT_SELECTOR=

SENTRY_URL=https://sentry.io
SENTRY_AUTH_TOKEN=sntrys_your_real_token
SENTRY_ORG_SLUG=your-org
SENTRY_PROJECT_SLUGS=web-app,api-service
SENTRY_PROJECT_SELECTOR=
```

The screenshots show field labels and placeholder text, but **do not contain actual Grafana or Sentry API keys**. The Grafana URL shown in the first screenshot has been placed in `.env`; the Grafana API key and all Sentry secrets are blank intentionally. Create tokens in your own Grafana Cloud and Sentry accounts and paste them into `.env`. Do not commit `.env`.

### Token permissions
- Grafana: use a service account token with the minimum permissions required to access the Grafana health endpoint / APIs you intend to test.
- Sentry: use an auth token with organization/project read access for the connection test. For event ingestion via SDK, set `SENTRY_DSN` (separate from the API token).

## API quick tests
Run these in a browser REST client or terminal while the app is running:

```bash
curl -i -X POST http://localhost:4173/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"scenario":"server"}'

curl -i -X POST http://localhost:4173/api/webhooks/grafana \
  -H "Content-Type: application/json" \
  -d '{"status":"firing","title":"CPU saturation","message":"CPU > 95%","labels":{"service":"checkout"}}'

curl -i -X POST http://localhost:4173/api/webhooks/sentry \
  -H "Content-Type: application/json" \
  -d '{"message":"Unhandled checkout exception","project":{"name":"web-app"}}'
```

## Production build
```bash
npm run build
npm start
```
The Express server serves the built frontend and API on the same port.

## Relationship to your main project
Your repository describes a React/Vite developer platform with a provider-plugin model, a unified monitoring/incident view, and Grafana/Sentry integrations. This lab is a focused companion test harness: it generates controlled failures and webhook events so you can validate those integration surfaces without a database or Kubernetes. It does not modify your main repository or claim to provision real production services.
