# Equipment Integration: Dev vs Prod

This app uses a single, minimal abstraction to source live equipment and batch telemetry:

- Module: `src/lib/equipmentFeed.ts`
- Contract:
  - `subscribeToEquipmentFeed(listener)` — provides snapshots `{ timestamp, batches, equipmentTelemetry }`
  - `ensureEquipmentFeed(options?)` — starts the feed (dev or prod)
  - `registerEquipmentFeed(customFeed)` — swaps in a production-grade data source

## Development (default)

- Source: Digital Twin simulation (`src/lib/digitalTwin.ts`)
- Behavior:
  - Synthetic but realistic drift in CPPs and equipment telemetry
  - Emits a consistent `TwinSnapshot` used across Dashboard, Analytics, and Equipment Details
- Why: zero external dependencies, fast iteration, tiny footprint

## Production (extensible)

Implement one object and register it at startup:

```ts
import { registerEquipmentFeed } from '@/lib/equipmentFeed'

registerEquipmentFeed({
  subscribe: (listener) => {
    // Bridge to your plant data pipeline and call listener(snapshot)
    // Return an unsubscribe handle
    return () => {/* detach */}
  }
})
```

### Common industrial interfaces

- OPC UA: Subscribe to nodes for CPPs/telemetry; aggregate into snapshot; maintain clock sync (UTC) and include server timestamps where possible.
- MQTT: Topic-per-equipment or batch; collect latest per tick and emit snapshot.
- Historian (REST/SDK): Poll recent samples (last N sec) and downsample; combine with MES batch context.
- File drop: Ingest rolling CSV/JSON increments; parse and snapshot.

### Data integrity and GMP considerations

- Time sync: Ensure monotonic timestamps and UTC normalization; include source timestamps.
- Data lineage: Keep source IDs (equipment IDs, historian tags) in your adapter (see `src/data/equipmentCatalog.ts` for tag hints).
- Validation: Treat the adapter as a validated system boundary; add checksums and retries.
- Availability: Buffer short outages and fill-forward last known good values with flags.
- Security: Read-only credentials for monitors; log access in audit.

## Touchpoints using the feed

- `Dashboard.tsx` — KPIs + equipment list (clickable) from live snapshots
- `Analytics.tsx` — quality and equipment risk analytics from live snapshots
- `EquipmentDetails.tsx` — live metrics + trends + related quality records
- `use-production-batches.ts` — batch list used in multiple views

No other code changes are required when swapping in a production feed.
