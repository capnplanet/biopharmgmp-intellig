# BioPharm GMP Intelligence Platform - Technical Guide

**Version:** 1.0  
**Last Updated:** November 2025  
**Platform Version:** 0.1.0

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Data Models](#data-models)
4. [Digital Twin Simulation](#digital-twin-simulation)
5. [Quality Automation Engine](#quality-automation-engine)
6. [Predictive Analytics Models](#predictive-analytics-models)
7. [API Reference](#api-reference)
8. [Integration Patterns](#integration-patterns)
9. [Use Cases & Examples](#use-cases--examples)
10. [Security & Compliance](#security--compliance)
11. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

### System Architecture

The BioPharm GMP Intelligence Platform is a modern web application built with a React frontend and optional Node.js backend for enterprise features.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │   Quality    │  │  Analytics   │          │
│  │  Monitoring  │  │  Management  │  │  Predictive  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Component Library (Radix UI + Tailwind)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Digital Twin │  │   Quality    │  │   Modeling   │          │
│  │  Simulation  │  │  Automation  │  │    Engine    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Express.js - Optional)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Audit Store  │  │ Metrics Store│  │   Archive    │          │
│  │  (JSONL +    │  │  (Time-Series│  │  (WORM-like) │          │
│  │  Hash Chain) │  │   Logging)   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Integrations (Production)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   OPC UA     │  │     MES      │  │   Historian  │          │
│  │  Equipment   │  │    Batch     │  │   Process    │          │
│  │    Data      │  │    Data      │  │    Data      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React 19**: Modern component-based UI
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Recharts & D3**: Data visualization
- **React Query**: Server state management
- **Framer Motion**: Smooth animations

#### Backend (Optional)
- **Express.js**: Lightweight REST API
- **JSONL Storage**: Append-only audit logs
- **SHA-256 Hash Chain**: Tamper detection
- **RBAC**: Role-based access control

#### State Management
- **@github/spark**: KV store for reactive state
- **useKV Hook**: Persistent key-value storage with subscriptions

---

## Core Components

### 1. Dashboard Component

The Dashboard provides real-time overview of manufacturing operations.

**File:** `src/components/Dashboard.tsx`

**Key Features:**
- Live equipment status monitoring
- Active batch tracking
- Critical alerts display
- KPI visualization
- Historical trend charts

**Code Example:**

```tsx
import { Dashboard } from '@/components/Dashboard'

function App() {
  return (
    <div className="app">
      <Dashboard />
    </div>
  )
}
```

**State Management:**

```tsx
// Dashboard uses equipment feed subscription
import { subscribeToEquipmentFeed } from '@/lib/equipmentFeed'

useEffect(() => {
  const unsubscribe = subscribeToEquipmentFeed((snapshot) => {
    setBatchState(snapshot.batches)
    setEquipmentTelemetryState(snapshot.equipmentTelemetry)
  })
  return unsubscribe
}, [])
```

### 2. Quality Management System (eQMS)

Comprehensive quality workflow management for deviations, CAPAs, investigations, and change controls.

**File:** `src/components/QualityManagement.tsx`

**Key Features:**
- Deviation management with severity tracking
- CAPA (Corrective and Preventive Actions) workflows
- Investigation management with stage gates
- Change control processes
- E-signature support

**Code Example:**

```tsx
// Creating a deviation programmatically
import { useKV } from '@github/spark/hooks'
import type { Deviation } from '@/types/quality'

function useDeviationManagement() {
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations', [])
  
  const createDeviation = (data: Omit<Deviation, 'id'>) => {
    const newDeviation: Deviation = {
      ...data,
      id: `DEV-${Date.now()}`,
      reportedDate: new Date(),
      status: 'open',
    }
    setDeviations([...deviations, newDeviation])
    return newDeviation
  }
  
  return { deviations, createDeviation }
}
```


### 3. Batch Monitoring

Real-time tracking of batch execution and critical process parameters.

**File:** `src/components/BatchMonitoring.tsx`

**Key Features:**
- Live batch status and progress
- Critical Process Parameter (CPP) tracking
- Compliance monitoring with color-coded alerts
- Historical batch comparison
- Timeline visualization

**Code Example:**

```tsx
import { useProductionBatches } from '@/hooks/use-production-batches'
import { getCPPCompliance } from '@/data/seed'

function BatchMonitor() {
  const { batches } = useProductionBatches()
  
  return (
    <div>
      {batches.map(batch => {
        const compliance = getCPPCompliance(batch)
        return (
          <div key={batch.id}>
            <h3>{batch.id}</h3>
            <p>CPP Compliance: {(compliance * 100).toFixed(1)}%</p>
          </div>
        )
      })}
    </div>
  )
}
```

### 4. Predictive Analytics

ML-based analysis for quality prediction and equipment failure detection.

**File:** `src/components/Analytics.tsx`

**Key Features:**
- Quality risk scoring
- Equipment failure prediction
- Deviation risk assessment
- Model performance metrics (AUROC, Brier, ECE)
- Trend analysis and visualization

**Code Example:**

```tsx
import { monitor, type ModelId } from '@/lib/modeling'

function ModelMetrics({ modelId }: { modelId: ModelId }) {
  const metrics = monitor.metrics(modelId, {
    threshold: 0.5,
    minN: 10,
    requireBothClasses: true
  })
  
  return (
    <div>
      <p>AUROC: {metrics.auroc.toFixed(3)}</p>
      <p>Accuracy: {metrics.accuracy ? (metrics.accuracy * 100).toFixed(1) + '%' : 'N/A'}</p>
      <p>Brier Score: {metrics.brier.toFixed(3)}</p>
      <p>ECE: {metrics.ece.toFixed(3)}</p>
    </div>
  )
}
```

### 5. Audit Trail

Complete audit logging with tamper detection.

**File:** `src/components/AuditTrail.tsx`

**Key Features:**
- Comprehensive event logging
- User action tracking
- AI interaction logging
- Hash chain verification
- Evidence package export

**Code Example:**

```tsx
import { useAuditLogger } from '@/hooks/use-audit'

function useQualityAction() {
  const { log, withAudit } = useAuditLogger()
  
  const approveDeviation = async (deviationId: string) => {
    await withAudit(
      'Approve Deviation',
      'deviation',
      `Approved deviation ${deviationId}`,
      async () => {
        // Perform approval logic
        await performApproval(deviationId)
      },
      { recordId: deviationId }
    )
  }
  
  return { approveDeviation }
}
```

---

## Data Models

### Batch Data Model

**File:** `src/data/seed.ts`

```typescript
export interface BatchData {
  id: string
  product: string
  status: 'queued' | 'running' | 'paused' | 'complete' | 'warning' | 'failed'
  progress: number
  startTime: Date
  equipment: string
  parameters: {
    temperature: { value: number; target: number }
    pressure: { value: number; target: number }
    pH: { value: number; target: number }
    volume: { value: number; target: number }
  }
  cppBounds: {
    temperature: { min: number; max: number }
    pressure: { min: number; max: number }
    pH: { min: number; max: number }
    volume: { min: number; max: number }
  }
  timeline: Array<{
    phase: string
    status: 'complete' | 'active' | 'pending'
    startTime: Date
    endTime?: Date
  }>
}
```

### Quality Types

**File:** `src/types/quality.ts`

```typescript
// Deviation
export interface Deviation {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  batchId: string
  reportedBy: string
  reportedDate: Date
  assignedTo?: string
  rootCause?: string
  correctiveActions?: string[]
  effectivenessCheck?: EffectivenessCheck
  signatures?: ESignatureRecord[]
  origin?: 'manual' | 'digital-twin' | 'ai'
  metadata?: Record<string, unknown>
}

// CAPA (Corrective and Preventive Action)
export interface CAPA {
  id: string
  title: string
  description: string
  type: 'corrective' | 'preventive'
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'approved' | 'implementing' | 'complete'
  dueDate: Date
  assignedTo: string
  relatedDeviations: string[]
  actions: CapaAction[]
  effectivenessCheck?: EffectivenessCheck
  signatures?: ESignatureRecord[]
}

// Investigation
export interface Investigation {
  id: string
  deviationId: string
  title: string
  description: string
  status: 'triage' | 'analysis' | 'root-cause' | 'corrective-actions' | 'effectiveness' | 'closed'
  assignedTo: string
  createdAt: Date
  stages: InvestigationStage[]
  timeline: InvestigationTimelineEvent[]
}
```

### Audit Event Model

**File:** `src/hooks/use-audit.ts`

```typescript
export type AuditEvent = {
  id: string
  timestamp: Date
  userId: string
  userRole: string
  action: string
  module: 'batch' | 'quality' | 'equipment' | 'system' | 'deviation' | 'capa' | 'change-control' | 'navigation' | 'workflow' | 'ai'
  details: string
  recordId?: string
  ipAddress: string
  sessionId: string
  outcome: 'success' | 'failure' | 'warning'
  digitalSignature?: string
}
```

---

## Digital Twin Simulation

The Digital Twin provides realistic manufacturing simulation for development and training.

**File:** `src/lib/digitalTwin.ts`

### Architecture

```typescript
export type TwinOptions = {
  tickMs: number              // Real-time interval between ticks
  simSecondsPerTick: number   // Simulated seconds per tick
  monitorEverySimSeconds: number  // Prediction sampling interval
}

export type TwinHandle = {
  start: () => void
  stop: () => void
  isRunning: () => boolean
  setSpeed: (simSecondsPerTick: number) => void
  getSpeed: () => number
}
```

### Starting the Digital Twin

```typescript
import { startDigitalTwin } from '@/lib/digitalTwin'

// Start with default options
const twin = startDigitalTwin()

// Start with custom options
const customTwin = startDigitalTwin({
  tickMs: 2000,              // Update every 2 seconds
  simSecondsPerTick: 60,     // Simulate 60 seconds per tick
  monitorEverySimSeconds: 30 // Sample predictions every 30 sim seconds
})
```

### Subscribing to Twin Events

```typescript
import { subscribeToTwin, type TwinSnapshot } from '@/lib/digitalTwin'

const unsubscribe = subscribeToTwin((snapshot: TwinSnapshot) => {
  console.log('Twin update:', {
    timestamp: snapshot.timestamp,
    batchCount: snapshot.batches.length,
    equipmentCount: snapshot.equipmentTelemetry.length
  })
  
  // Update application state
  updateDashboard(snapshot)
})

// Cleanup when done
unsubscribe()
```

### Simulated Events

The Digital Twin generates realistic events:
- **CPP Drift**: Temperature, pressure, pH, and volume variations
- **Equipment Alerts**: Vibration spikes, utilization changes
- **Batch Transitions**: Phase changes, completion events
- **Quality Events**: Out-of-spec (OOS) and out-of-trend (OOT) conditions

### Example: CPP Drift Simulation

```typescript
// Inside digitalTwin.ts - simplified excerpt
function applyDrift(batch: BatchData, simSeconds: number) {
  const driftRate = 0.01 // 1% per simulated minute
  const noise = randn() * 0.1 // Gaussian noise
  
  // Temperature drift
  const tempDrift = driftRate * (simSeconds / 60) + noise
  batch.parameters.temperature.value += tempDrift
  
  // Check bounds
  const { min, max } = batch.cppBounds.temperature
  const outOfSpec = batch.parameters.temperature.value < min || 
                    batch.parameters.temperature.value > max
  
  if (outOfSpec) {
    // Generate deviation event
    generateOOSEvent(batch, 'temperature')
  }
}
```

---

## Quality Automation Engine

The Quality Automation Engine monitors batch data and automatically generates quality events.

**File:** `src/lib/qualityAutomation.ts`

### Automation Triggers

Two types of automated quality triggers:

1. **OOS (Out of Specification)**: Parameter exceeds defined bounds
2. **OOT (Out of Trend)**: Sustained drift toward bounds

### Initialization

```typescript
import { initializeQualityAutomation } from '@/lib/qualityAutomation'

// Initialize automation engine (call once at app startup)
initializeQualityAutomation()
```

### Automated Deviation Creation

When the automation engine detects an issue, it automatically creates a deviation:

```typescript
// Example of automation proposal structure
export type AutomationProposalDetail = {
  trigger: 'OOS' | 'OOT'
  batchId: string
  parameter: 'temperature' | 'pressure' | 'pH' | 'volume'
  measurement: {
    value: number
    target: number
    min: number
    max: number
    deviation: number
    compliance: number
  }
  deviation: Deviation
  suggestion: AutomationSuggestion
}
```

### Example: Responding to Automation Suggestions

```typescript
import { useKV } from '@github/spark/hooks'
import type { AutomationSuggestion } from '@/types/automation'

function AutomationQueue() {
  const [queue = []] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const [, setDeviations] = useKV<Deviation[]>('deviations', [])
  
  const acceptSuggestion = (suggestion: AutomationSuggestion) => {
    // Add deviation to quality management
    setDeviations(prev => [...prev, suggestion.proposedDeviation])
    
    // Remove from queue
    setQueue(queue.filter(s => s.id !== suggestion.id))
  }
  
  return (
    <div>
      {queue.map(suggestion => (
        <div key={suggestion.id}>
          <h3>{suggestion.type}</h3>
          <p>{suggestion.summary}</p>
          <button onClick={() => acceptSuggestion(suggestion)}>
            Accept
          </button>
        </div>
      ))}
    </div>
  )
}
```

### Severity Determination

```typescript
// Automated severity scoring based on deviation magnitude
function determineSeverity(
  trigger: 'OOS' | 'OOT',
  deviationMagnitude: number,
  range: number
): 'low' | 'medium' | 'high' | 'critical' {
  const ratio = range === 0 ? deviationMagnitude : Math.abs(deviationMagnitude) / range
  
  if (trigger === 'OOS') {
    if (ratio > 0.75) return 'critical'
    if (ratio > 0.5) return 'high'
    return 'medium'
  }
  
  // OOT events are cautionary
  if (ratio > 0.6) return 'high'
  return 'medium'
}
```

---

## Predictive Analytics Models

The platform includes three predictive models for proactive quality management.

**File:** `src/lib/modeling.ts`

### Model Types

```typescript
export type ModelId = 'quality_prediction' | 'equipment_failure' | 'deviation_risk'
```

### Model Monitor

Centralized monitoring of model predictions:

```typescript
import { monitor } from '@/lib/modeling'

// Add a prediction record
monitor.add({
  id: 'pred-001',
  model: 'quality_prediction',
  timestamp: Date.now(),
  p: 0.85,  // Predicted probability [0,1]
  y: 1,     // Observed outcome (0 or 1)
  features: {
    temperature: 37.2,
    pressure: 1.8,
    pH: 7.1,
    batchAge: 48
  }
})
```

### Computing Metrics

```typescript
// Get performance metrics for a model
const metrics = monitor.metrics('quality_prediction', {
  threshold: 0.95,           // Decision threshold
  minN: 10,                  // Minimum samples required
  requireBothClasses: true   // Require both positive and negative examples
})

console.log({
  n: metrics.n,                    // Sample count
  accuracy: metrics.accuracy,      // Classification accuracy
  brier: metrics.brier,            // Brier score (calibration)
  ece: metrics.ece,                // Expected Calibration Error
  auroc: metrics.auroc,            // Area Under ROC Curve
  hasPosNeg: metrics.hasPosNeg    // Has both classes
})
```

### Decision Thresholds

Each model has a configured threshold for classification:

```typescript
import { decisionThreshold } from '@/lib/modeling'

// Thresholds are tuned per model
const thresholds = {
  quality_prediction: 0.95,  // Strict: y=1 means all CPPs in spec
  deviation_risk: 0.5,       // Balanced
  equipment_failure: 0.5     // Balanced
}
```

### Quality Prediction Model

Predicts whether all Critical Process Parameters will remain in specification:

```typescript
import { predictQuality } from '@/lib/modeling'

function checkBatchQuality(batch: BatchData) {
  const prediction = predictQuality(batch)
  
  return {
    probability: prediction.p,
    inSpec: prediction.p >= decisionThreshold.quality_prediction,
    features: prediction.features,
    confidence: Math.abs(prediction.p - 0.5) * 2  // 0 to 1
  }
}
```


### Equipment Failure Prediction

Predicts equipment failure risk based on telemetry:

```typescript
import { predictEquipmentFailure } from '@/lib/modeling'

function monitorEquipment(equipment: EquipmentTelemetry) {
  const prediction = predictEquipmentFailure(equipment)
  
  if (prediction.p > decisionThreshold.equipment_failure) {
    // High risk - generate alert
    createMaintenanceAlert(equipment.id, prediction.p)
  }
}
```

### Deviation Risk Scoring

Assesses risk of quality deviations:

```typescript
import { predictDeviationRisk } from '@/lib/modeling'

function assessBatchRisk(batch: BatchData) {
  const riskScore = predictDeviationRisk(batch)
  
  return {
    score: riskScore.p,
    level: riskScore.p > 0.7 ? 'high' : riskScore.p > 0.4 ? 'medium' : 'low',
    factors: riskScore.features
  }
}
```


---

## API Reference

### Backend API Endpoints

**Base URL:** `http://localhost:5000/api` (development)

#### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "ok": true,
  "service": "biopharmgmp-api",
  "time": "2025-11-13T18:10:36.476Z",
  "version": "0.1.0"
}
```

#### Audit Trail

**Append Audit Event**

```http
POST /api/audit
Content-Type: application/json
Authorization: Bearer <token>  (if AUTH_TOKEN set)
X-User-Role: Admin             (if RBAC_ENABLED)
```

**Request Body:**
```json
{
  "action": "Approve Deviation",
  "module": "deviation",
  "details": "Approved deviation DEV-123",
  "recordId": "DEV-123",
  "outcome": "success"
}
```

**Response:**
```json
{
  "ok": true,
  "event": {
    "id": "AUD-20251113181036-001",
    "timestamp": "2025-11-13T18:10:36.476Z",
    "userId": "user@example.com",
    "action": "Approve Deviation",
    "module": "deviation",
    "details": "Approved deviation DEV-123",
    "recordId": "DEV-123",
    "outcome": "success",
    "hash": "sha256:abc123...",
    "prevHash": "sha256:def456..."
  }
}
```

**Query Audit Events**

```http
GET /api/audit?from=2025-11-01&to=2025-11-13&limit=100
```

**Response:**
```json
{
  "ok": true,
  "events": [
    {
      "id": "AUD-20251113181036-001",
      "timestamp": "2025-11-13T18:10:36.476Z",
      "action": "Approve Deviation",
      "module": "deviation",
      "details": "Approved deviation DEV-123"
    }
  ]
}
```

**Verify Hash Chain**

```http
GET /api/audit/verify
```

**Response:**
```json
{
  "ok": true,
  "valid": true,
  "totalRecords": 1523,
  "firstRecord": "2025-10-01T00:00:00.000Z",
  "lastRecord": "2025-11-13T18:10:36.476Z"
}
```

#### Metrics

**Append Metrics Point**

```http
POST /api/metrics
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "quality_prediction",
  "metrics": {
    "auroc": 0.87,
    "brier": 0.12,
    "ece": 0.08,
    "accuracy": 0.89
  },
  "timestamp": "2025-11-13T18:10:36.476Z"
}
```

**Query Metrics**

```http
GET /api/metrics?from=2025-11-01&to=2025-11-13&limit=100
```

#### Archive Status

```http
GET /api/audit/archive/status
```

**Response:**
```json
{
  "ok": true,
  "enabled": true,
  "rootPath": "/path/to/archive",
  "totalFiles": 1523,
  "verificationStatus": "ok"
}
```

---

## Integration Patterns

### Equipment Feed Integration

**File:** `src/lib/equipmentFeed.ts`

#### Development Mode (Digital Twin)

```typescript
import { ensureEquipmentFeed, subscribeToEquipmentFeed } from '@/lib/equipmentFeed'

// Initialize equipment feed (uses Digital Twin by default)
ensureEquipmentFeed()

// Subscribe to updates
const unsubscribe = subscribeToEquipmentFeed((snapshot) => {
  console.log('Equipment update:', snapshot)
  updateDashboard(snapshot.batches, snapshot.equipmentTelemetry)
})
```

#### Production Mode (OPC UA Example)

```typescript
import { registerEquipmentFeed } from '@/lib/equipmentFeed'
import { OPCUAClient } from 'node-opcua'

// Custom OPC UA adapter
registerEquipmentFeed({
  subscribe: (listener) => {
    const client = new OPCUAClient()
    
    // Connect to OPC UA server
    client.connect('opc.tcp://plc.example.com:4840')
    
    // Subscribe to equipment nodes
    const subscription = client.createSubscription({
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10
    })
    
    // Monitor CPP nodes
    const items = [
      { nodeId: 'ns=2;s=Temperature', attributeId: AttributeIds.Value },
      { nodeId: 'ns=2;s=Pressure', attributeId: AttributeIds.Value }
    ]
    
    subscription.monitor(items, (dataValues) => {
      // Transform to platform snapshot format
      const snapshot = transformOPCUAData(dataValues)
      listener(snapshot)
    })
    
    // Return cleanup function
    return () => {
      subscription.terminate()
      client.disconnect()
    }
  }
})
```

#### MQTT Integration Example

```typescript
import { registerEquipmentFeed } from '@/lib/equipmentFeed'
import * as mqtt from 'mqtt'

registerEquipmentFeed({
  subscribe: (listener) => {
    const client = mqtt.connect('mqtt://broker.example.com:1883')
    
    client.on('connect', () => {
      // Subscribe to equipment topics
      client.subscribe('factory/+/equipment/#')
      client.subscribe('factory/+/batches/#')
    })
    
    const dataBuffer = new Map()
    
    client.on('message', (topic, payload) => {
      const data = JSON.parse(payload.toString())
      dataBuffer.set(topic, data)
      
      // Emit snapshot when enough data collected
      if (shouldEmitSnapshot(dataBuffer)) {
        const snapshot = aggregateSnapshot(dataBuffer)
        listener(snapshot)
      }
    })
    
    return () => {
      client.end()
    }
  }
})
```

### AI/LLM Integration

#### On-Premise LLM Gateway

**File:** `src/lib/onPremSparkProvider.ts`

```typescript
import { registerOnPremSpark } from '@/lib/onPremSparkProvider'

// Configure on-premise LLM endpoint
registerOnPremSpark({
  endpoint: 'https://llm.yourcompany.com/v1/chat',
  token: 'your-api-token',
  model: 'gpt-4' // or your model name
})
```

#### Using AI Assistant

```typescript
import { getSpark } from '@/lib/spark'

async function queryOperationsAssistant(prompt: string) {
  const spark = getSpark()
  if (!spark) {
    return 'AI assistant unavailable'
  }
  
  try {
    const response = await spark.llm(prompt, 'gpt-4')
    
    // Log AI interaction for audit
    logAuditEvent({
      action: 'AI Query',
      module: 'ai',
      details: `Prompt: ${prompt.substring(0, 100)}...`,
      outcome: 'success'
    })
    
    return response
  } catch (error) {
    logAuditEvent({
      action: 'AI Query',
      module: 'ai',
      details: `Error: ${error.message}`,
      outcome: 'failure'
    })
    throw error
  }
}
```


---

## Use Cases & Examples

### Use Case 1: Real-Time Batch Monitoring

**Scenario:** Monitor active batches and receive alerts for CPP deviations.

```typescript
import { useProductionBatches } from '@/hooks/use-production-batches'
import { getCPPCompliance } from '@/data/seed'
import { useAlerts } from '@/hooks/use-alerts'

function BatchMonitoringDashboard() {
  const { batches } = useProductionBatches()
  const { addAlert } = useAlerts()
  
  useEffect(() => {
    batches.forEach(batch => {
      const compliance = getCPPCompliance(batch)
      
      // Alert if compliance drops below 95%
      if (compliance < 0.95 && batch.status === 'running') {
        addAlert({
          id: `alert-${batch.id}`,
          message: `Batch ${batch.id} CPP compliance: ${(compliance * 100).toFixed(1)}%`,
          severity: compliance < 0.90 ? 'critical' : 'high',
          module: 'batch',
          timestamp: new Date(),
          autoResolve: false
        })
      }
    })
  }, [batches])
  
  return (
    <div className="grid gap-4">
      {batches.map(batch => (
        <BatchCard key={batch.id} batch={batch} />
      ))}
    </div>
  )
}
```

### Use Case 2: Automated Deviation Management

**Scenario:** Automatically create deviations when equipment goes out of spec.

```typescript
import { initializeQualityAutomation, subscribeToAutomation } from '@/lib/qualityAutomation'
import { useKV } from '@github/spark/hooks'
import type { AutomationSuggestion } from '@/types/automation'

function AutomatedQualityMonitor() {
  const [queue, setQueue] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations', [])
  
  useEffect(() => {
    // Initialize automation engine
    initializeQualityAutomation()
    
    // Subscribe to automation proposals
    const unsubscribe = subscribeToAutomation((proposal) => {
      // Automatically accept OOS events (critical)
      if (proposal.trigger === 'OOS' && proposal.measurement.compliance < 0.85) {
        setDeviations(prev => [...prev, proposal.deviation])
        toast.error(`Auto-created deviation: ${proposal.deviation.title}`)
      } else {
        // Queue OOT events for review
        setQueue(prev => [...prev, proposal.suggestion])
      }
    })
    
    return unsubscribe
  }, [])
  
  return (
    <div>
      <h2>Automation Queue ({queue.length})</h2>
      {queue.map(suggestion => (
        <SuggestionCard 
          key={suggestion.id} 
          suggestion={suggestion}
          onAccept={() => acceptSuggestion(suggestion)}
          onReject={() => rejectSuggestion(suggestion)}
        />
      ))}
    </div>
  )
}
```

### Use Case 3: CAPA Workflow with E-Signatures

**Scenario:** Create and approve a CAPA with electronic signatures.

```typescript
import { useKV } from '@github/spark/hooks'
import { ESignaturePrompt } from '@/components/ESignaturePrompt'
import type { CAPA } from '@/types/quality'

function CAPAWorkflow({ deviationId }: { deviationId: string }) {
  const [capas, setCapas] = useKV<CAPA[]>('capas', [])
  const [showSignature, setShowSignature] = useState(false)
  const [currentCapa, setCurrentCapa] = useState<CAPA | null>(null)
  
  const createCAPA = (data: Omit<CAPA, 'id' | 'status' | 'signatures'>) => {
    const capa: CAPA = {
      ...data,
      id: `CAPA-${Date.now()}`,
      status: 'draft',
      signatures: []
    }
    setCapas([...capas, capa])
    return capa
  }
  
  const approveCAPA = (capaId: string) => {
    const capa = capas.find(c => c.id === capaId)
    if (!capa) return
    
    setCurrentCapa(capa)
    setShowSignature(true)
  }
  
  const handleSignature = (signature: SignatureResult) => {
    if (!currentCapa) return
    
    const updatedCapa = {
      ...currentCapa,
      status: 'approved' as const,
      signatures: [
        ...(currentCapa.signatures || []),
        {
          id: `SIG-${Date.now()}`,
          action: 'CAPA Approval',
          signedBy: signature.userId,
          signedAt: new Date(),
          reason: signature.reason,
          digitalSignature: signature.signature
        }
      ]
    }
    
    setCapas(capas.map(c => c.id === currentCapa.id ? updatedCapa : c))
    setShowSignature(false)
    toast.success('CAPA approved and signed')
  }
  
  return (
    <div>
      <button onClick={() => createCAPA({
        title: 'Temperature Control Improvement',
        description: 'Implement enhanced PID tuning',
        type: 'corrective',
        priority: 'high',
        dueDate: new Date(Date.now() + 30 * 86400000),
        assignedTo: 'Engineering',
        relatedDeviations: [deviationId],
        actions: []
      })}>
        Create CAPA
      </button>
      
      {showSignature && (
        <ESignaturePrompt
          action="Approve CAPA"
          onSign={handleSignature}
          onCancel={() => setShowSignature(false)}
        />
      )}
    </div>
  )
}
```

### Use Case 4: Predictive Maintenance

**Scenario:** Monitor equipment and schedule maintenance based on failure predictions.

```typescript
import { subscribeToEquipmentFeed } from '@/lib/equipmentFeed'
import { predictEquipmentFailure, decisionThreshold } from '@/lib/modeling'

function PredictiveMaintenanceMonitor() {
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([])
  
  useEffect(() => {
    const unsubscribe = subscribeToEquipmentFeed((snapshot) => {
      snapshot.equipmentTelemetry.forEach(equipment => {
        const prediction = predictEquipmentFailure(equipment)
        
        // High failure risk detected
        if (prediction.p > decisionThreshold.equipment_failure) {
          const alert: MaintenanceAlert = {
            id: `MAINT-${equipment.id}-${Date.now()}`,
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            failureRisk: prediction.p,
            priority: prediction.p > 0.8 ? 'critical' : 'high',
            recommendedAction: determineMaintenanceAction(prediction),
            timestamp: new Date()
          }
          
          setMaintenanceAlerts(prev => [...prev, alert])
          
          // Notify maintenance team
          notifyMaintenanceTeam(alert)
        }
      })
    })
    
    return unsubscribe
  }, [])
  
  return (
    <div>
      <h2>Predictive Maintenance Alerts</h2>
      {maintenanceAlerts.map(alert => (
        <MaintenanceAlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}

function determineMaintenanceAction(prediction: { p: number; features: Features }) {
  if (prediction.features.vibrationRMS > 2.5) {
    return 'Inspect bearings and alignment'
  }
  if (prediction.features.utilization > 0.95) {
    return 'Schedule preventive maintenance during next downtime'
  }
  return 'Monitor closely and schedule inspection'
}
```

### Use Case 5: Audit Trail Export for Regulatory Inspection

**Scenario:** Export complete audit trail with hash chain verification for FDA inspection.

```typescript
import { useKV } from '@github/spark/hooks'
import { generateEvidencePackage } from '@/utils/evidenceExport'
import JSZip from 'jszip'

async function exportAuditEvidence(startDate: Date, endDate: Date) {
  const [auditEvents] = useKV<AuditEvent[]>('audit-events', [])
  
  // Filter events by date range
  const filteredEvents = auditEvents.filter(event => 
    event.timestamp >= startDate && event.timestamp <= endDate
  )
  
  // Verify hash chain integrity
  const verified = verifyHashChain(filteredEvents)
  if (!verified) {
    throw new Error('Audit trail integrity check failed')
  }
  
  // Create evidence package
  const zip = new JSZip()
  
  // Add audit trail
  zip.file('audit-trail.json', JSON.stringify(filteredEvents, null, 2))
  
  // Add verification report
  zip.file('verification-report.txt', `
    Audit Trail Verification Report
    ================================
    
    Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}
    Total Events: ${filteredEvents.length}
    Hash Chain: VERIFIED
    Export Date: ${new Date().toISOString()}
    
    Chain Verification:
    - First Event: ${filteredEvents[0]?.id}
    - Last Event: ${filteredEvents[filteredEvents.length - 1]?.id}
    - All hashes validated: YES
  `)
  
  // Add AI interaction log
  const aiEvents = filteredEvents.filter(e => e.module === 'ai')
  zip.file('ai-interactions.json', JSON.stringify(aiEvents, null, 2))
  
  // Generate ZIP file
  const blob = await zip.generateAsync({ type: 'blob' })
  
  // Download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-evidence-${startDate.toISOString().split('T')[0]}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
```


---

## Security & Compliance

### 21 CFR Part 11 Compliance

#### Electronic Records

The platform implements key requirements for electronic records:

1. **Computer-Generated Records**: All audit events are timestamped and attributed
2. **Tamper Detection**: SHA-256 hash chain prevents undetected modifications
3. **Archive Integrity**: Optional WORM-like archive for immutability

```typescript
// Hash chain implementation (simplified)
function appendAuditEvent(event: AuditEvent, previousHash: string): AuditEventStored {
  const payload = JSON.stringify({
    timestamp: event.timestamp,
    userId: event.userId,
    action: event.action,
    module: event.module,
    details: event.details
  })
  
  const hash = createHash('sha256')
    .update(previousHash + payload)
    .digest('hex')
  
  return {
    ...event,
    hash: `sha256:${hash}`,
    prevHash: previousHash
  }
}
```

#### Electronic Signatures

```typescript
// E-signature implementation
import { webcrypto } from 'crypto'

async function generateSignature(
  userId: string,
  action: string,
  reason: string,
  timestamp: Date
): Promise<string> {
  const data = JSON.stringify({ userId, action, reason, timestamp })
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  
  // In production: use PKI/HSM
  // This is a simplified example
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `SHA256:${hashHex}`
}
```

### Access Control

#### RBAC (Role-Based Access Control)

```typescript
// User roles
export type UserRole = 
  | 'Admin'
  | 'Quality Approver'
  | 'Supervisor'
  | 'Operator'
  | 'System'

// Permission checking
function checkPermission(user: User, action: string, resource: string): boolean {
  const permissions = {
    'Admin': ['*'],
    'Quality Approver': ['approve_deviation', 'approve_capa', 'sign_document'],
    'Supervisor': ['create_deviation', 'create_capa', 'view_analytics'],
    'Operator': ['view_dashboard', 'view_batches'],
    'System': ['create_audit_event', 'record_metrics']
  }
  
  const userPermissions = permissions[user.role] || []
  return userPermissions.includes('*') || userPermissions.includes(action)
}
```

### Data Integrity (ALCOA+)

The platform ensures data integrity following ALCOA+ principles:

- **Attributable**: All events logged with user ID and timestamp
- **Legible**: Human-readable JSON format
- **Contemporaneous**: Real-time event logging
- **Original**: Append-only audit trail
- **Accurate**: Hash chain verification
- **Complete**: Full context in audit details
- **Consistent**: Standardized event structure
- **Enduring**: Persistent storage with backups
- **Available**: Query API for retrieval

### Security Best Practices

1. **API Authentication**:
```bash
# Set authentication token
export AUTH_TOKEN=your-secure-token

# Enable RBAC
export RBAC_ENABLED=true

# Start server with security enabled
npm run server
```

2. **On-Premise LLM** (no external API calls):
```bash
export VITE_ONPREM_LLM_ENDPOINT=https://your-llm-gateway.com/v1/chat
export VITE_ONPREM_LLM_TOKEN=your-secret-token
```

3. **Archive Protection**:
```bash
export ARCHIVE_ENABLED=true
export ARCHIVE_DIR=/secure/immutable-storage
```

---

## Deployment Guide

### Development Deployment

```bash
# Clone repository
git clone https://github.com/capnplanet/biopharmgmp-intellig.git
cd biopharmgmp-intellig

# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# OR: Start with backend API
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

Access the application at `http://localhost:4000`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Output is in dist/ directory
ls -la dist/
```

### Cloud Deployment

The platform supports comprehensive cloud deployment to AWS and Azure with full containerization support.

**For complete cloud deployment instructions, see the [Cloud Deployment Guide](CLOUD_DEPLOYMENT.md).**

#### Quick Overview

**AWS Deployment:**
- ECS Fargate with Application Load Balancer
- EFS for persistent storage
- CloudWatch for monitoring
- Terraform infrastructure as code
- Automated deployment scripts

**Azure Deployment:**
- App Service with Container Registry
- Azure Files for persistent storage
- Application Insights for monitoring
- Terraform infrastructure as code
- Automated deployment scripts

**Docker Compose:**
- Multi-container orchestration
- Local and on-premise deployment
- Volume management for persistent data
- Environment-based configuration

### Docker Deployment

See `Dockerfile`, `Dockerfile.frontend`, and `docker-compose.yml` in the repository root:

```bash
# Local/on-premise deployment with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

The containerized deployment includes:
- Multi-stage builds for optimized images
- Non-root user for security
- Health checks for reliability
- Volume mounts for persistent data
- Nginx for frontend serving

### Environment Configuration

Create `.env` file:

```bash
# Frontend Configuration
VITE_ONPREM_LLM_ENDPOINT=https://llm.yourcompany.com/v1/chat
VITE_ONPREM_LLM_TOKEN=your-api-token

# Backend Configuration
PORT=5000
AUTH_TOKEN=your-secure-token
RBAC_ENABLED=true
ARCHIVE_ENABLED=true
ARCHIVE_DIR=/data/audit-archive

# Optional: Backend auth for frontend
VITE_BACKEND_AUTH_TOKEN=your-secure-token
VITE_RBAC_ROLE=Admin
```

### Production Equipment Integration

For production deployment, replace the Digital Twin with real equipment data:

```typescript
// main.tsx or initialization file
import { registerEquipmentFeed } from '@/lib/equipmentFeed'
import { createProductionFeed } from './adapters/production-feed'

// Register production equipment feed
if (import.meta.env.PROD) {
  const feed = createProductionFeed({
    opcuaEndpoint: 'opc.tcp://production-plc:4840',
    mesEndpoint: 'https://mes.yourcompany.com/api',
    historianEndpoint: 'https://historian.yourcompany.com/api'
  })
  
  registerEquipmentFeed(feed)
}
```

### Monitoring & Logging

```typescript
// Configure logging
import { createLogger } from './utils/logger'

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  outputs: [
    { type: 'console' },
    { type: 'file', path: '/var/log/biopharmgmp/app.log' },
    { type: 'syslog', host: 'syslog.yourcompany.com' }
  ]
})

// Log critical events
logger.error('Equipment failure predicted', {
  equipmentId: 'FERMT-001',
  failureRisk: 0.92
})
```

### Backup & Disaster Recovery

```bash
# Backup audit trail
tar -czf audit-backup-$(date +%Y%m%d).tar.gz server/.data/

# Backup archive
tar -czf archive-backup-$(date +%Y%m%d).tar.gz server/.archive/

# Verify backups
tar -tzf audit-backup-*.tar.gz | head
```

### Performance Tuning

1. **Frontend Optimization**:
   - Enable production build optimizations
   - Use code splitting for large components
   - Implement virtual scrolling for large lists

2. **Backend Optimization**:
   - Enable JSONL file compression
   - Implement pagination for audit queries
   - Use database for high-volume deployments

3. **Network Optimization**:
   - Enable gzip compression
   - Configure CDN for static assets
   - Implement API response caching

---

## Appendix

### File Structure Reference

```
biopharmgmp-intellig/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx              # Main dashboard
│   │   ├── BatchMonitoring.tsx        # Batch tracking
│   │   ├── QualityManagement.tsx      # eQMS
│   │   ├── Analytics.tsx              # Predictive analytics
│   │   ├── AuditTrail.tsx             # Audit logging
│   │   ├── OperationsAssistant.tsx    # AI assistant
│   │   └── ui/                        # UI components
│   ├── lib/
│   │   ├── digitalTwin.ts             # Equipment simulation
│   │   ├── qualityAutomation.ts       # Quality engine
│   │   ├── modeling.ts                # Predictive models
│   │   ├── equipmentFeed.ts           # Equipment abstraction
│   │   ├── spark.ts                   # LLM interface
│   │   └── onPremSparkProvider.ts     # On-prem LLM
│   ├── hooks/
│   │   ├── use-audit.ts               # Audit logging
│   │   ├── use-alerts.ts              # Alert management
│   │   └── use-production-batches.ts  # Batch data
│   ├── types/
│   │   ├── quality.ts                 # Quality types
│   │   ├── automation.ts              # Automation types
│   │   └── workflows.ts               # Workflow types
│   ├── data/
│   │   ├── seed.ts                    # Seed data
│   │   └── equipmentCatalog.ts        # Equipment metadata
│   └── App.tsx                        # Main app
├── server/
│   ├── index.mjs                      # Express server
│   └── stores/
│       ├── auditStore.mjs             # Audit JSONL
│       ├── metricsStore.mjs           # Metrics storage
│       └── immutableArchive.mjs       # WORM archive
├── docs/
│   ├── TECHNICAL_GUIDE.md             # This document
│   ├── platform-abstraction-layer.md  # PAL architecture
│   ├── local-api.md                   # API documentation
│   ├── equipment-integration.md       # Equipment integration
│   └── ai-credibility-assessment.md   # FDA risk assessment
└── README.md                          # Getting started
```

### Key Dependencies

```json
{
  "@github/spark": "^0.39.0",
  "@radix-ui/react-*": "Latest",
  "recharts": "^2.15.1",
  "d3": "^7.9.0",
  "framer-motion": "^12.6.2",
  "zod": "^3.25.76",
  "date-fns": "^3.6.0",
  "jszip": "^3.10.1",
  "express": "^4.21.2",
  "cors": "^2.8.5"
}
```

### Glossary

- **CPP**: Critical Process Parameter - A parameter that must remain within defined bounds
- **CAPA**: Corrective and Preventive Action - Quality improvement process
- **OOS**: Out of Specification - Parameter exceeds defined limits
- **OOT**: Out of Trend - Sustained drift toward specification limits
- **GMP**: Good Manufacturing Practice - Quality standards for pharmaceutical manufacturing
- **eQMS**: Electronic Quality Management System
- **ALCOA+**: Data integrity principles (Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available)
- **21 CFR Part 11**: FDA regulation for electronic records and signatures
- **WORM**: Write Once Read Many - Immutable storage
- **AUROC**: Area Under Receiver Operating Characteristic - Model performance metric
- **ECE**: Expected Calibration Error - Model calibration metric

### Support & Resources

- **Documentation**: `/docs` directory in repository
- **Issue Tracker**: GitHub Issues
- **License**: Proprietary - Broad Spectrum GxP LLC
- **Security**: Report to opensource-security@github.com

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** Development Team
