# BioPharm GMP Intelligence Platform

**Version:** 1.0  
**Platform Version:** 0.1.0

An AI-powered platform for real-time manufacturing oversight, quality management, and predictive analytics in biotechnology and pharmaceutical GMP (Good Manufacturing Practice) environments.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Getting Started](#getting-started)
6. [Repository Structure](#repository-structure)
7. [Core Components](#core-components)
8. [Digital Twin Simulation](#digital-twin-simulation)
9. [Quality Automation Engine](#quality-automation-engine)
10. [Predictive Analytics](#predictive-analytics)
11. [API Reference](#api-reference)
12. [Integration Patterns](#integration-patterns)
13. [Security & Compliance](#security--compliance)
14. [Configuration](#configuration)
15. [Cloud Platform Compatibility](#cloud-platform-compatibility)
16. [Scripts](#scripts)
17. [Documentation](#documentation)
18. [License](#license)

## Overview

This platform provides comprehensive manufacturing intelligence and quality assurance capabilities for biotech/pharma operations, featuring:

- **Real-time Manufacturing Oversight**: Live monitoring of batch execution, equipment status, and critical process parameters
- **AI-Powered Quality Management**: Intelligent workflows for deviations, investigations, CAPAs (Corrective and Preventive Actions), and change controls
- **Predictive Analytics**: ML-based analysis of historical and real-time MES data to predict quality issues and equipment failures
- **Regulatory Compliance**: Complete audit trails, e-signatures, and evidence packages aligned with ICH, ISO, and GMP standards
- **Digital Twin Simulation**: Equipment behavior simulation for testing and training scenarios

## Key Features

### 1. Real-Time Dashboard
- Live equipment status monitoring
- Batch execution tracking
- Critical alerts and notifications
- KPI visualization
- Historical trend charts

### 2. Quality Management System (eQMS)
- **Deviations**: Create, investigate, and resolve manufacturing deviations with severity tracking
- **Investigations**: AI-assisted root cause analysis workflows with stage gates
- **CAPAs**: Corrective and preventive action management with effectiveness checks
- **Change Controls**: Structured change management process with approval workflows
- **E-Signatures**: Electronic signature capture with audit trail and 21 CFR Part 11 compliance

### 3. Batch Monitoring
- Real-time batch status and progress tracking
- Critical Process Parameter (CPP) monitoring with compliance checking
- Batch analytics and trending
- Historical batch comparison
- Timeline visualization

### 4. Predictive Analytics
- Equipment failure prediction using ML models
- Quality risk scoring for proactive management
- Trend analysis and pattern recognition
- Model performance metrics (AUROC, Brier, ECE)
- Automated deviation risk assessment

### 5. Audit & Compliance
- Tamper-evident audit trail with SHA-256 hash chain verification
- AI interaction logging for transparency
- Evidence package export (FDA-ready)
- Archive validation with WORM-like semantics
- Complete ALCOA+ data integrity

### 6. Operations Assistant
- AI-powered copilot for manufacturing operations
- Natural language queries for data insights
- Contextual recommendations
- Integrated with quality workflows

## Architecture

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

## Technology Stack

### Frontend
- **React 19** with TypeScript - Modern component-based UI
- **Vite** - Fast build tool and dev server
- **GitHub Spark** - AI-powered development framework with KV store
- **Tailwind CSS** - Utility-first styling with custom pharmaceutical-focused design system
- **Radix UI** - Accessible component primitives
- **Recharts & D3** - Data visualization and charting
- **React Query** - Server state management
- **Framer Motion** - Smooth animations

### Backend (Optional)
- **Express.js** - Lightweight REST API server
- **Node.js** - Runtime environment
- **JSONL-based storage** - Append-only audit logs with SHA-256 hash chain
- **Optional RBAC** - Role-based access control for compliance

### State Management
- **@github/spark** - KV store for reactive state with useKV hook
- **Persistent key-value storage** - With subscriptions and real-time updates

### Key Libraries
- **@github/spark** - AI capabilities and state management
- **framer-motion** - Animations
- **zod** - Schema validation
- **jszip** - Archive generation
- **date-fns** - Date manipulation

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm (Node.js 18+ is supported but Node.js 20+ is recommended for cloud deployments)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/capnplanet/biopharmgmp-intellig.git
cd biopharmgmp-intellig

# Install dependencies
npm install
```

### Development

Run the frontend development server:

```bash
npm run dev
```

The application will be available at `http://localhost:4000` (or the port shown in console).

### Optional: Run the Backend API

For full functionality including persistent audit trails and metrics:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend API
npm run server
```

The API runs on `http://localhost:5000`. See [docs/local-api.md](docs/local-api.md) for details.

**Kill port 5000 if needed:**
```bash
npm run kill
```

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Cloud Deployment

The platform supports deployment to AWS and Azure with full containerization support.

#### Docker Deployment

For local or on-premise containerized deployment:

```bash
# Create .env file with your configuration
cp .env.example .env  # Edit with your settings

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### AWS Deployment

Deploy to AWS ECS Fargate with Application Load Balancer:

```bash
# Prerequisites: AWS CLI, Docker, Terraform (optional)

# Deploy infrastructure (using Terraform)
cd deploy/aws/terraform
terraform init
terraform apply

# Build and deploy application
cd ../../..
./deploy/scripts/deploy-aws.sh
```

**AWS Services Used:**
- ECS Fargate for container orchestration
- Application Load Balancer for traffic distribution
- EFS for persistent storage
- ECR for container registry
- CloudWatch for logging and monitoring
- Secrets Manager for credentials

#### Azure Deployment

Deploy to Azure App Service with Container Registry:

```bash
# Prerequisites: Azure CLI, Docker, Terraform (optional)

# Deploy infrastructure (using Terraform)
cd deploy/azure/terraform
terraform init
terraform apply

# Build and deploy application
cd ../../..
./deploy/scripts/deploy-azure.sh
```

**Azure Services Used:**
- App Service for container hosting
- Container Registry for Docker images
- Storage Account for persistent data
- Key Vault for secrets management
- Application Insights for monitoring

For detailed deployment instructions, see [Cloud Deployment Guide](docs/CLOUD_DEPLOYMENT.md).

## Repository Structure

```
biopharmgmp-intellig/
├── src/
│   ├── components/        # React components (75+ components)
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── BatchMonitoring.tsx    # Batch tracking
│   │   ├── QualityManagement.tsx  # eQMS workflows
│   │   ├── Analytics.tsx          # Analytics & reporting
│   │   ├── AuditTrail.tsx         # Audit logging
│   │   ├── OperationsAssistant.tsx # AI assistant
│   │   └── ui/                    # Reusable UI components
│   ├── lib/               # Core libraries
│   │   ├── digitalTwin.ts         # Equipment simulation
│   │   ├── qualityAutomation.ts   # Quality workflow engine
│   │   ├── modeling.ts            # Predictive models
│   │   ├── equipmentFeed.ts       # Equipment data abstraction
│   │   ├── spark.ts               # LLM interface
│   │   ├── onPremSparkProvider.ts # On-prem LLM gateway
│   │   └── devSparkMock.ts        # Development mock
│   ├── hooks/             # Custom React hooks
│   │   ├── use-audit.ts           # Audit logging
│   │   ├── use-alerts.ts          # Alert management
│   │   └── use-production-batches.ts # Batch data
│   ├── types/             # TypeScript type definitions
│   │   ├── quality.ts             # Quality types
│   │   ├── automation.ts          # Automation types
│   │   └── workflows.ts           # Workflow types
│   ├── utils/             # Utility functions
│   ├── data/              # Seed data and mock data
│   │   ├── seed.ts                # Seed data
│   │   └── equipmentCatalog.ts    # Equipment metadata
│   └── App.tsx            # Main application component
├── server/                # Backend API
│   ├── index.mjs          # Express server
│   └── stores/            # Data stores
│       ├── auditStore.mjs         # Audit JSONL with hash chain
│       ├── metricsStore.mjs       # Metrics storage
│       └── immutableArchive.mjs   # WORM archive
├── docs/                  # Documentation
│   ├── TECHNICAL_GUIDE.md         # Comprehensive technical guide
│   ├── CLOUD_DEPLOYMENT.md        # Cloud deployment guide
│   ├── platform-abstraction-layer.md # PAL architecture
│   ├── local-api.md               # API documentation
│   ├── equipment-integration.md   # Equipment connectivity
│   ├── ai-credibility-assessment.md # FDA risk assessment
│   └── evidence/          # FDA validation templates
├── deploy/                # Cloud deployment configurations
│   ├── aws/               # AWS-specific configurations
│   │   ├── terraform/     # AWS Terraform IaC
│   │   ├── ecs-task-definition.json
│   │   └── Dockerrun.aws.json
│   ├── azure/             # Azure-specific configurations
│   │   └── terraform/     # Azure Terraform IaC
│   └── scripts/           # Deployment helper scripts
│       ├── deploy-aws.sh
│       └── deploy-azure.sh
├── Dockerfile             # Backend container image
├── Dockerfile.frontend    # Frontend container image (Nginx)
├── docker-compose.yml     # Multi-container orchestration
├── nginx.conf             # Nginx configuration for frontend
├── public/                # Static assets
└── dist/                  # Build output (generated)
```

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

**Example Usage:**

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

**Creating a Deviation:**

```tsx
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

**Example:**

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

**Model Metrics:**

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

**Example:**

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

## Digital Twin Simulation

The Digital Twin provides realistic manufacturing simulation for development and training.

**File:** `src/lib/digitalTwin.ts`

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

### Digital Twin Controls

The platform includes a floating digital twin controller for simulating equipment behavior:

- **Play/Pause**: Control simulation execution
- **Speed**: Adjust simulation speed (5-600 seconds per tick)
- **Draggable**: Reposition the control panel

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

### Responding to Automation Suggestions

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

## Predictive Analytics

The platform includes three predictive models for proactive quality management.

**File:** `src/lib/modeling.ts`

### Model Types

```typescript
export type ModelId = 'quality_prediction' | 'equipment_failure' | 'deviation_risk'
```

### Quality Prediction Model

Predicts whether all Critical Process Parameters will remain in specification:

```typescript
import { predictQuality, decisionThreshold } from '@/lib/modeling'

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
import { predictEquipmentFailure, decisionThreshold } from '@/lib/modeling'

function monitorEquipment(equipment: EquipmentTelemetry) {
  const prediction = predictEquipmentFailure(equipment)
  
  if (prediction.p > decisionThreshold.equipment_failure) {
    // High risk - generate alert
    createMaintenanceAlert(equipment.id, prediction.p)
  }
}
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

// Get performance metrics
const metrics = monitor.metrics('quality_prediction', {
  threshold: 0.95,
  minN: 10,
  requireBothClasses: true
})
```

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

**Query Audit Events**

```http
GET /api/audit?from=2025-11-01&to=2025-11-13&limit=100
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

See [docs/local-api.md](docs/local-api.md) for complete API documentation.

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
    
    // Monitor CPP nodes and transform to platform snapshot format
    // ... (see TECHNICAL_GUIDE.md for complete example)
    
    return () => {
      subscription.terminate()
      client.disconnect()
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

## Security & Compliance

### 21 CFR Part 11 Compliance

The platform implements key requirements for electronic records:

1. **Computer-Generated Records**: All audit events are timestamped and attributed
2. **Tamper Detection**: SHA-256 hash chain prevents undetected modifications
3. **Archive Integrity**: Optional WORM-like archive for immutability

#### Hash Chain Implementation

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

### E-Signatures

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
  
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `SHA256:${hashHex}`
}
```

### RBAC (Optional)

Supported roles:
- **Admin**: Full system access
- **Quality Approver**: Approve deviations, CAPAs, sign documents
- **Supervisor**: Create deviations/CAPAs, view analytics
- **Operator**: View dashboard and batches
- **System**: Create audit events, record metrics

Enable via `RBAC_ENABLED=true` environment variable.

## Configuration

### Environment Variables

Create a `.env` file for custom configuration:

```bash
# On-premise LLM Gateway (optional)
VITE_ONPREM_LLM_ENDPOINT=https://your-llm-gateway.com/v1/chat
VITE_ONPREM_LLM_TOKEN=your-secret-token

# API Server (backend)
PORT=5000
AUTH_TOKEN=your-auth-token
RBAC_ENABLED=true
ARCHIVE_ENABLED=true
ARCHIVE_DIR=/data/audit-archive

# Optional: Backend auth for frontend
VITE_BACKEND_AUTH_TOKEN=your-auth-token
VITE_RBAC_ROLE=Admin
```

See [docs/platform-abstraction-layer.md](docs/platform-abstraction-layer.md) for deployment options.

## Cloud Platform Compatibility

The BioPharm GMP Intelligence Platform is designed with cloud-native compatibility, supporting deployment on major cloud platforms including AWS and Azure. The platform's architecture leverages industry-standard protocols and storage patterns, enabling seamless integration with cloud services while maintaining GMP compliance requirements.

### AWS (Amazon Web Services) Compatibility

#### Deployment Architecture

The platform can be deployed on AWS using multiple service configurations:

**Container-Based Deployment (Recommended)**

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Application Load Balancer (ALB)                      │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────┴─────────────────────────────────┐  │
│  │  Amazon ECS / EKS (Container Orchestration)          │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   Frontend   │  │   Backend    │                 │  │
│  │  │  Container   │  │  Container   │                 │  │
│  │  │ (React+Vite) │  │ (Express.js) │                 │  │
│  │  └──────────────┘  └──────────────┘                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Amazon     │  │   Amazon     │  │   Amazon     │     │
│  │   RDS/       │  │   S3         │  │   KMS        │     │
│  │   DynamoDB   │  │   (Audit     │  │   (Encryption│     │
│  │   (Optional) │  │   Archive)   │  │   Keys)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### AWS Services Integration

**1. Compute Services**

- **Amazon EC2**: Deploy as traditional virtual machines with full control
  - Recommended instance types: t3.medium or larger for frontend, t3.small for backend
  - Auto Scaling Groups for high availability
  
- **Amazon ECS (Elastic Container Service)**: Container orchestration with Fargate or EC2 launch types
  ```bash
  # Example ECS task definition
  {
    "family": "biopharmgmp-frontend",
    "containerDefinitions": [{
      "name": "frontend",
      "image": "your-registry/biopharmgmp-frontend:latest",
      "memory": 512,
      "cpu": 256,
      "portMappings": [{"containerPort": 4000}]
    }]
  }
  ```

- **Amazon EKS (Elastic Kubernetes Service)**: Full Kubernetes orchestration for enterprise deployments
  
- **AWS Lambda**: Serverless functions for API endpoints and background processing
  - Deploy backend API endpoints as Lambda functions
  - Use API Gateway for RESTful API routing
  - Cost-effective for intermittent workloads

**2. Storage Services**

- **Amazon S3**: Immutable audit trail archive storage with compliance features
  ```bash
  # S3 bucket configuration for audit archives
  aws s3api create-bucket \
    --bucket biopharmgmp-audit-archive \
    --region us-east-1
  
  # Enable versioning for audit trail integrity
  aws s3api put-bucket-versioning \
    --bucket biopharmgmp-audit-archive \
    --versioning-configuration Status=Enabled
  
  # Enable Object Lock for WORM compliance
  aws s3api put-object-lock-configuration \
    --bucket biopharmgmp-audit-archive \
    --object-lock-configuration \
      'ObjectLockEnabled=Enabled,Rule={DefaultRetention={Mode=COMPLIANCE,Years=7}}'
  ```
  
  - **S3 with Object Lock**: WORM (Write Once Read Many) compliance for 21 CFR Part 11
  - **S3 Glacier**: Long-term archival storage for historical audit trails
  - **S3 Versioning**: Automatic versioning for data integrity
  - **S3 Lifecycle Policies**: Automated transition to cost-effective storage tiers

- **Amazon EFS (Elastic File System)**: Shared file storage for multi-container deployments
  - Ideal for shared configuration and temporary data exchange

**3. Database Services**

- **Amazon RDS** (PostgreSQL/MySQL): Production-grade relational database for audit events and metrics
  ```bash
  # Example RDS configuration
  aws rds create-db-instance \
    --db-instance-identifier biopharmgmp-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --master-username admin \
    --allocated-storage 100 \
    --backup-retention-period 30 \
    --storage-encrypted
  ```
  
- **Amazon DynamoDB**: NoSQL database for high-throughput event logging
  - Sub-millisecond latency for real-time audit logging
  - Auto-scaling for variable workloads
  - Point-in-time recovery for data protection

- **Amazon ElastiCache**: Redis/Memcached for session state and caching
  - Cache equipment telemetry data
  - Real-time KV store for platform state

**4. Security & Compliance Services**

- **AWS IAM (Identity and Access Management)**: Fine-grained access control
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectLegalHold"
      ],
      "Resource": "arn:aws:s3:::biopharmgmp-audit-archive/*"
    }]
  }
  ```

- **AWS KMS (Key Management Service)**: Encryption key management
  - Encrypt audit trails at rest
  - Rotate encryption keys automatically
  - Audit key usage via CloudTrail

- **AWS Secrets Manager**: Secure credential storage
  - Store API tokens, database passwords
  - Automatic credential rotation
  - Integration with RDS and other services

- **AWS Certificate Manager**: SSL/TLS certificate management
  - Free certificates for application load balancers
  - Automatic renewal

**5. Monitoring & Logging Services**

- **Amazon CloudWatch**: Comprehensive monitoring and alerting
  ```javascript
  // Example CloudWatch integration for audit logging
  const cloudwatch = new AWS.CloudWatch();
  
  cloudwatch.putMetricData({
    Namespace: 'BioPharmGMP',
    MetricData: [{
      MetricName: 'AuditEventsProcessed',
      Value: eventCount,
      Unit: 'Count',
      Timestamp: new Date()
    }]
  });
  ```
  
  - Real-time metrics and dashboards
  - Custom alarms for critical events
  - Log aggregation and analysis

- **AWS CloudTrail**: API audit logging for compliance
  - Track all AWS API calls
  - Integrate with platform audit trail
  - Compliance reporting

- **Amazon Managed Grafana**: Advanced visualization and analytics
  - Custom dashboards for batch monitoring
  - Equipment telemetry visualization
  - Quality metrics trending

**6. Integration Services**

- **AWS IoT Core**: Equipment connectivity for manufacturing floor
  - MQTT broker for equipment telemetry
  - Device shadows for equipment state
  - Rules engine for real-time processing
  
  ```javascript
  // Example IoT Core integration for equipment feed
  import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
  
  const client = new IoTDataPlaneClient({ region: "us-east-1" });
  
  async function publishEquipmentData(equipmentId, telemetry) {
    await client.send(new PublishCommand({
      topic: `factory/equipment/${equipmentId}/telemetry`,
      payload: JSON.stringify(telemetry),
      qos: 1
    }));
  }
  ```

- **AWS AppSync**: GraphQL API for real-time data synchronization
- **Amazon EventBridge**: Event-driven architecture for quality automation triggers

**7. Deployment Patterns on AWS**

**Pattern 1: Single-Region Production Deployment**
```bash
# Using AWS CDK (Infrastructure as Code)
# Install dependencies
npm install -g aws-cdk
npm install @aws-cdk/aws-ecs @aws-cdk/aws-s3

# Deploy stack
cdk deploy biopharmgmp-production
```

**Pattern 2: Multi-Region High Availability**
- Primary region: Production workloads
- Secondary region: Disaster recovery and read replicas
- S3 Cross-Region Replication for audit archives
- Route 53 for DNS failover

**Pattern 3: Hybrid Cloud with AWS Outposts**
- On-premises AWS infrastructure for data sovereignty
- Local compute and storage with AWS management
- Seamless integration with cloud services

#### AWS Environment Configuration

```bash
# .env configuration for AWS deployment
VITE_ONPREM_LLM_ENDPOINT=https://your-llm.amazonaws.com/v1/chat
VITE_ONPREM_LLM_TOKEN=your-secret-token

# Backend API with AWS services
PORT=5000
AUTH_TOKEN=your-auth-token
RBAC_ENABLED=true

# S3 Archive configuration
ARCHIVE_ENABLED=true
ARCHIVE_TYPE=s3
AWS_S3_BUCKET=biopharmgmp-audit-archive
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# RDS Database (optional)
DATABASE_URL=postgresql://user:pass@biopharmgmp-db.region.rds.amazonaws.com:5432/biopharmgmp

# DynamoDB (optional)
DYNAMODB_AUDIT_TABLE=biopharmgmp-audit-events
DYNAMODB_METRICS_TABLE=biopharmgmp-metrics

# CloudWatch monitoring
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/biopharmgmp/application
```

#### AWS Compliance Considerations

- **HIPAA Compliance**: AWS provides HIPAA-eligible services (sign BAA)
- **GxP Compliance**: S3 Object Lock provides WORM storage for 21 CFR Part 11
- **Data Residency**: Region selection ensures data sovereignty requirements
- **Audit Trail**: CloudTrail + Platform audit trail = complete compliance picture
- **Encryption**: KMS encryption at rest, TLS 1.2+ in transit

---

### Azure (Microsoft Azure) Compatibility

#### Deployment Architecture

The platform can be deployed on Azure using multiple service configurations:

**Container-Based Deployment (Recommended)**

```
┌─────────────────────────────────────────────────────────────┐
│                      Azure Cloud                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Azure Application Gateway / Front Door               │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────┴─────────────────────────────────┐  │
│  │  Azure Kubernetes Service (AKS) / Container Instances│  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   Frontend   │  │   Backend    │                 │  │
│  │  │  Container   │  │  Container   │                 │  │
│  │  │ (React+Vite) │  │ (Express.js) │                 │  │
│  │  └──────────────┘  └──────────────┘                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Azure      │  │   Blob       │  │   Key        │     │
│  │   SQL/       │  │   Storage    │  │   Vault      │     │
│  │   Cosmos DB  │  │   (Audit     │  │   (Secrets)  │     │
│  │   (Optional) │  │   Archive)   │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### Azure Services Integration

**1. Compute Services**

- **Azure Virtual Machines**: Full control over compute resources
  - Recommended VM sizes: Standard_D2s_v3 or larger for production
  - Virtual Machine Scale Sets for auto-scaling
  
- **Azure Kubernetes Service (AKS)**: Managed Kubernetes for container orchestration
  ```bash
  # Create AKS cluster
  az aks create \
    --resource-group biopharmgmp-rg \
    --name biopharmgmp-cluster \
    --node-count 3 \
    --enable-addons monitoring \
    --generate-ssh-keys
  
  # Deploy application
  kubectl apply -f kubernetes/deployment.yaml
  ```

- **Azure Container Instances**: Serverless containers for simple deployments
  - Fast startup times
  - Pay-per-second billing
  - Ideal for batch processing and background jobs

- **Azure Functions**: Serverless compute for event-driven workloads
  - Deploy backend API as Azure Functions
  - Integration with Azure Event Grid and Service Bus
  - Automatic scaling based on demand

**2. Storage Services**

- **Azure Blob Storage**: Immutable audit trail archive with compliance features
  ```bash
  # Create storage account with immutability
  az storage account create \
    --name biopharmgmpaudit \
    --resource-group biopharmgmp-rg \
    --location eastus \
    --sku Standard_GRS \
    --kind StorageV2 \
    --enable-hierarchical-namespace false
  
  # Create container with immutability policy
  az storage container create \
    --name audit-archive \
    --account-name biopharmgmpaudit
  
  # Enable immutability (WORM) for compliance
  az storage container immutability-policy create \
    --account-name biopharmgmpaudit \
    --container-name audit-archive \
    --period 2555 \
    --allow-protected-append-writes true
  ```
  
  - **Immutable Blob Storage**: WORM compliance for 21 CFR Part 11
  - **Archive Tier**: Cost-effective long-term storage
  - **Geo-Redundant Storage (GRS)**: Multi-region replication
  - **Lifecycle Management**: Automated tier transitions

- **Azure Files**: Managed file shares for multi-container access
  - SMB and NFS protocol support
  - Integration with on-premises systems

**3. Database Services**

- **Azure SQL Database**: Managed relational database with enterprise features
  ```bash
  # Create Azure SQL Database
  az sql server create \
    --name biopharmgmp-sql \
    --resource-group biopharmgmp-rg \
    --location eastus \
    --admin-user sqladmin \
    --admin-password <SecurePassword>
  
  az sql db create \
    --resource-group biopharmgmp-rg \
    --server biopharmgmp-sql \
    --name biopharmgmp-db \
    --service-objective S2 \
    --backup-storage-redundancy Geo
  ```
  
  - Automatic backups and point-in-time restore
  - Transparent Data Encryption (TDE)
  - Advanced threat protection

- **Azure Cosmos DB**: Globally distributed NoSQL database
  - Multi-model support (Document, Key-Value, Graph)
  - Single-digit millisecond latency
  - Automatic indexing for complex queries
  - Change feed for real-time event processing

- **Azure Database for PostgreSQL/MySQL**: Managed open-source databases
  - Flexible server deployment options
  - Built-in high availability
  - Integration with Azure Monitor

**4. Security & Compliance Services**

- **Azure Active Directory (Azure AD)**: Enterprise identity and access management
  ```bash
  # Configure app registration for authentication
  az ad app create \
    --display-name "BioPharm GMP Platform" \
    --available-to-other-tenants false
  ```
  
  - Single sign-on (SSO) integration
  - Multi-factor authentication (MFA)
  - Conditional access policies
  - Role-based access control (RBAC)

- **Azure Key Vault**: Secure secrets, keys, and certificate management
  ```javascript
  // Example Key Vault integration
  const { SecretClient } = require("@azure/keyvault-secrets");
  const { DefaultAzureCredential } = require("@azure/identity");
  
  const credential = new DefaultAzureCredential();
  const vaultName = "biopharmgmp-keyvault";
  const url = `https://${vaultName}.vault.azure.net`;
  
  const client = new SecretClient(url, credential);
  const secret = await client.getSecret("DatabasePassword");
  ```
  
  - HSM-backed key protection
  - Automatic certificate renewal
  - Audit logging of access

- **Azure Policy**: Governance and compliance enforcement
  - Enforce tagging standards
  - Restrict resource types and regions
  - Ensure encryption requirements

- **Azure Security Center**: Unified security management
  - Threat detection and prevention
  - Security recommendations
  - Compliance dashboard

**5. Monitoring & Logging Services**

- **Azure Monitor**: Comprehensive monitoring and analytics
  ```javascript
  // Example Azure Monitor integration
  const { ApplicationInsights } = require("applicationinsights");
  
  ApplicationInsights
    .setup("your-instrumentation-key")
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .start();
  
  const client = ApplicationInsights.defaultClient;
  client.trackEvent({ name: "AuditEventLogged" });
  ```
  
  - Real-time metrics and alerts
  - Application Performance Monitoring (APM)
  - Custom dashboards and workbooks

- **Azure Log Analytics**: Centralized log aggregation and analysis
  - KQL (Kusto Query Language) for advanced queries
  - Integration with audit trail
  - Long-term log retention

- **Application Insights**: Application performance monitoring
  - Real-time performance metrics
  - Dependency tracking
  - Failure analysis and diagnostics

**6. Integration Services**

- **Azure IoT Hub**: Equipment connectivity and management
  - Bi-directional communication with manufacturing equipment
  - Device-to-cloud telemetry
  - Cloud-to-device commands and configuration
  
  ```javascript
  // Example IoT Hub integration for equipment feed
  const { EventHubConsumerClient } = require("@azure/event-hubs");
  
  const client = new EventHubConsumerClient(
    "$Default",
    "your-iothub-connection-string"
  );
  
  client.subscribe({
    processEvents: async (events) => {
      for (const event of events) {
        const telemetry = event.body;
        updateEquipmentFeed(telemetry);
      }
    }
  });
  ```

- **Azure Event Grid**: Event-driven architecture
  - Real-time event routing
  - Integration with quality automation triggers
  - Custom event schemas

- **Azure Service Bus**: Enterprise messaging
  - Reliable message queuing
  - Pub/sub patterns for event distribution
  - Dead-letter queues for error handling

**7. Deployment Patterns on Azure**

**Pattern 1: Single-Region Production Deployment**
```bash
# Using Azure CLI and ARM templates
az group create --name biopharmgmp-rg --location eastus

az deployment group create \
  --resource-group biopharmgmp-rg \
  --template-file azure-deploy.json \
  --parameters @azure-deploy.parameters.json
```

**Pattern 2: Multi-Region High Availability**
- Primary region: Production workloads
- Secondary region: Disaster recovery
- Azure Traffic Manager for DNS-based load balancing
- Blob Storage geo-replication for audit archives

**Pattern 3: Hybrid with Azure Arc**
- On-premises Kubernetes clusters managed via Azure Arc
- Unified governance across cloud and on-premises
- Azure services on-premises via Azure Stack

#### Azure Environment Configuration

```bash
# .env configuration for Azure deployment
VITE_ONPREM_LLM_ENDPOINT=https://your-llm.azurewebsites.net/v1/chat
VITE_ONPREM_LLM_TOKEN=your-secret-token

# Backend API with Azure services
PORT=5000
AUTH_TOKEN=your-auth-token
RBAC_ENABLED=true

# Blob Storage Archive configuration
ARCHIVE_ENABLED=true
ARCHIVE_TYPE=azure-blob
AZURE_STORAGE_ACCOUNT=biopharmgmpaudit
AZURE_STORAGE_CONTAINER=audit-archive
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

# Azure SQL Database (optional)
DATABASE_URL=mssql://user:pass@biopharmgmp-sql.database.windows.net:1433/biopharmgmp-db

# Cosmos DB (optional)
COSMOSDB_ENDPOINT=https://biopharmgmp-cosmos.documents.azure.com:443/
COSMOSDB_KEY=your-cosmos-key
COSMOSDB_DATABASE=biopharmgmp

# Azure Monitor
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;...
AZURE_MONITOR_ENABLED=true
```

#### Azure Compliance Considerations

- **HIPAA Compliance**: Azure provides HIPAA-compliant services (sign BAA)
- **GxP Compliance**: Immutable Blob Storage provides WORM for 21 CFR Part 11
- **Data Residency**: Region selection and data sovereignty controls
- **ISO 27001/27018**: Azure certifications support compliance requirements
- **Audit Trail**: Azure Activity Log + Platform audit trail = comprehensive auditing

---

### Multi-Cloud Deployment Considerations

The platform's architecture supports multi-cloud and hybrid deployment strategies:

**1. Cloud-Agnostic Design**
- Standard protocols (HTTP/REST, MQTT, OPC UA)
- Containerized applications (Docker/Kubernetes)
- Infrastructure as Code (Terraform for multi-cloud)

**2. Data Sovereignty**
- Deploy in specific regions to meet regulatory requirements
- Use cloud-native data residency controls
- Implement data classification and handling policies

**3. Cost Optimization**
- Use serverless computing for variable workloads
- Implement lifecycle policies for storage tiers
- Auto-scaling based on actual demand
- Reserved instances for predictable workloads

**4. Security Best Practices**
- Encryption at rest and in transit
- Network isolation with VPCs/VNets
- Principle of least privilege for IAM
- Regular security assessments and updates

**5. Migration Path**
- Start with development/test in cloud
- Gradual migration of non-critical workloads
- Parallel run with on-premises systems
- Validate compliance before production cutover

### Cloud Provider Feature Comparison

| Feature | AWS | Azure |
|---------|-----|-------|
| **Immutable Storage (WORM)** | S3 Object Lock | Blob Immutability Policy |
| **Container Orchestration** | ECS, EKS | AKS, Container Instances |
| **Serverless Compute** | Lambda | Functions |
| **Managed Databases** | RDS, DynamoDB | SQL Database, Cosmos DB |
| **Equipment IoT** | IoT Core | IoT Hub |
| **Identity Management** | IAM | Azure AD |
| **Secrets Management** | Secrets Manager, KMS | Key Vault |
| **Monitoring** | CloudWatch | Azure Monitor |
| **Object Storage** | S3 | Blob Storage |

Both platforms provide enterprise-grade services suitable for GMP-compliant pharmaceutical manufacturing applications. The choice between AWS and Azure often depends on:
- Existing organizational cloud commitments
- Regional data center availability
- Specific compliance requirements
- Integration with existing systems
- Cost structure and licensing agreements

For detailed deployment guides and infrastructure templates, see the [Technical Guide](docs/TECHNICAL_GUIDE.md) and [Platform Abstraction Layer](docs/platform-abstraction-layer.md) documentation.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (frontend) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run server` | Start backend API server |
| `npm run dev:api` | Alias for server |
| `npm run lint` | Run ESLint |
| `npm run kill` | Kill process on port 5000 |

## Documentation

### Technical Documentation

- **[Technical Guide](docs/TECHNICAL_GUIDE.md)** - Comprehensive technical documentation with advanced architecture details, data models, use cases, and deployment guide
- **[Cloud Deployment Guide](docs/CLOUD_DEPLOYMENT.md)** - Complete guide for deploying to AWS and Azure with Docker, Terraform, and deployment scripts
- **[Platform Abstraction Layer](docs/platform-abstraction-layer.md)** - Architecture and deployment flexibility
- **[Local API Server](docs/local-api.md)** - Backend API documentation
- **[Equipment Integration](docs/equipment-integration.md)** - Equipment connectivity guide
- **[AI Credibility Assessment](docs/ai-credibility-assessment.md)** - FDA 7-step risk assessment
- **[Evidence Package](docs/evidence/)** - FDA validation templates

For detailed code examples, advanced use cases, data models, and deployment strategies, see the [Technical Guide](docs/TECHNICAL_GUIDE.md).

For cloud deployment instructions (AWS, Azure, Docker), see the [Cloud Deployment Guide](docs/CLOUD_DEPLOYMENT.md).

## License

Proprietary License – Broad Spectrum GxP LLC

Copyright (c) 2025 Broad Spectrum GxP LLC. All rights reserved.

This software is confidential and proprietary. See [LICENSE](LICENSE) for full terms.

For licensing inquiries: legal@broadspectrumgxp.com

## Security

Please report security vulnerabilities to: opensource-security@github.com

See [SECURITY.md](SECURITY.md) for details.

## Contributing

This is a proprietary platform. Contributions are managed internally.

## Support

For questions or support, please contact the development team.
