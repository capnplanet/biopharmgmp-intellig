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

### Security (optional, non-breaking)

You can enable lightweight auth and RBAC via environment variables when starting the server:

```bash
# Example: enable token auth and RBAC + immutable archive
AUTH_TOKEN=dev-secret RBAC_ENABLED=true ARCHIVE_ENABLED=true npm run server
```

- If `AUTH_TOKEN` is set, mutating endpoints require `Authorization: Bearer <token>`.
- If `RBAC_ENABLED=true`, the server enforces roles via `X-User-Role` header on certain endpoints.
	- Allowed roles (example): Admin, Quality Approver, Supervisor, System
- If `ARCHIVE_ENABLED=true`, each append is also stored in a write-once archive under `server/.archive/`.
	- Check archive status: `GET /api/audit/archive/status`

### E-signature verification (scaffold)

- `POST /api/esign/verify` with `{ userId, reason, timestamp? }` returns `{ signature, timestamp }`.
	- In production, integrate with your IdP/PKI/HSM. This endpoint is a deterministic scaffold for pilots.

Data is stored under `server/.data/*.jsonl` and can be backed up or shipped to an immutable store.

## Immutable archive (optional)

You can enable a WORM-like append-only archive for audit payloads. When enabled, each audit record is also written as a standalone JSON file under `server/.archive/YYYY/MM/DD/` with a SHA‑256 checksum. Files are marked read-only after creation to discourage edits. This isn’t a replacement for true object-lock/WORM storage but provides local immutability semantics and verifiability.

Enable via env vars when starting the API:

```bash
# write to server/.archive (default)
ARCHIVE_ENABLED=true npm run server

# or specify a custom directory
ARCHIVE_ENABLED=true ARCHIVE_DIR=/data/immutable-archive npm run server
```

Endpoints:

- `GET /api/audit/archive/status` → basic archive status (enabled flag, root path, counts, verification ok/failed summary).

Notes:

- For true immutability in production, place the archive on object storage with object lock (e.g., S3 with WORM) or a filesystem with policy controls. This adapter is intentionally simple to keep pilots moving.

## Compliance notes

- Audit trail entries are chained via SHA‑256 of `{prevHash, payload}` and verified by `GET /api/audit/verify`.
## Auth and RBAC (optional)

Environment variables:

- `AUTH_TOKEN` → when set, mutating endpoints require `Authorization: Bearer <token>`
- `RBAC_ENABLED=true` → when enabled, set `X-User-Role` header; examples: `Admin`, `Quality Approver`, `Supervisor`, `System`

Example:

```bash
AUTH_TOKEN=devtoken RBAC_ENABLED=true npm run server

# curl with headers
curl -H 'Authorization: Bearer devtoken' -H 'X-User-Role: Admin' -d '{"action":"Test","module":"system","details":"ok"}' \
	-H 'Content-Type: application/json' http://localhost:5000/api/audit
```

- The UI continues to work without the API (offline-friendly); it forwards audit and metrics best‑effort when the API is available.
- Digital signatures created in the UI (Web Crypto SHA‑256) are preserved by the API when provided.
 - Optional immutable archive provides verifiable, append-only copies of audit records with per-file checksums and a verification endpoint.
