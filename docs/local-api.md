# Local API Server (Optional)

This project includes an optional, lightweight API used for:

- Tamper‑evident audit trail (append‑only JSONL with SHA‑256 hash chain)
- Model metrics time‑series collection
- Health endpoint for simple uptime checks

During development, the frontend proxies `/api/*` to `http://localhost:5000`.

## Run it

```bash
# Terminal 1: frontend (port 4000)
npm run dev

# Terminal 2: API (port 5000)
npm run server
```

If port 5000 is in use, free it:

```bash
npm run kill
```

## Endpoints

- GET /api/health → service status
- POST /api/audit → append an audit event (body mirrors the UI’s AuditEvent shape)
- GET /api/audit?from=&to=&limit= → query audit events
- GET /api/audit/verify → verify the on‑disk hash chain
- POST /api/metrics → append a metrics summary point
- GET /api/metrics?from=&to=&limit= → query metrics points

Data is stored under `server/.data/*.jsonl` and can be backed up or shipped to an immutable store.

## Compliance notes

- Audit trail entries are chained via SHA‑256 of `{prevHash, payload}` and verified by `GET /api/audit/verify`.
- The UI continues to work without the API (offline-friendly); it forwards audit and metrics best‑effort when the API is available.
- Digital signatures created in the UI (Web Crypto SHA‑256) are preserved by the API when provided.
