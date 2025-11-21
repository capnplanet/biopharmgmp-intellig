# BioPharm GMP Intelligence Platform

**Version:** 1.0  
**Platform Version:** 0.1.0

An AI-powered platform for real-time manufacturing oversight, quality management, and predictive analytics in biotechnology and pharmaceutical GMP (Good Manufacturing Practice) environments.

## Development Status

This platform is a **comprehensive reference implementation** demonstrating:
- ✅ Complete UI workflows for GMP quality management
- ✅ AI-powered operations assistance architecture and autonomous quality automation  
- ✅ Risk scoring analytics with performance monitoring infrastructure
- ✅ Audit trail and compliance features
- ✅ Cloud deployment configuration templates
- ✅ All features fully implemented and accessible in the UI

**Production Deployment Considerations**:
- 🔧 Requires external LLM provider configuration (Azure OpenAI, AWS Bedrock, or on-premise gateway) for Operations Assistant natural language processing
- 🔧 Risk scoring currently uses deterministic heuristic formulas; ML training infrastructure (logistic regression) implemented but requires activation for learned models
- 🔧 Backend API persistence verified for development; production deployment requires additional validation
- 🔧 Cloud deployment configurations provided as comprehensive starting templates (require customization for production security and compliance)
- 🔧 Equipment integration requires site-specific adapters (OPC UA and MES examples provided for reference)
- 🔧 Additional unit/integration testing, validation, and security hardening recommended for GMP production use
- 🔧 Deployment scripts and Terraform configurations require review and customization per organizational policies

**Testing Status**:
- ✅ Build and runtime verified
- ✅ All UI workflows accessible and functional
- ✅ Backend API endpoints implemented and tested
- ⚠️ Unit/integration test suite not included (recommended for production)
- ⚠️ End-to-end testing limited to manual verification

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [AI Functionality](#ai-functionality)
4. [Architecture](#architecture)
5. [Technology Stack](#technology-stack)
6. [Getting Started](#getting-started)
7. [Repository Structure](#repository-structure)
8. [Core Components](#core-components)
9. [Digital Twin Simulation](#digital-twin-simulation)
10. [Quality Automation Engine](#quality-automation-engine)
11. [Predictive Analytics](#predictive-analytics)
12. [AI Workflows and Data Flows](#ai-workflows-and-data-flows)
13. [AI Use Cases and Examples](#ai-use-cases-and-examples)
14. [API Reference](#api-reference)
15. [Integration Patterns](#integration-patterns)
16. [Security & Compliance](#security--compliance)
17. [Configuration](#configuration)
18. [Cloud Platform Compatibility](#cloud-platform-compatibility)
19. [Scripts](#scripts)
20. [Documentation](#documentation)
21. [License](#license)

## Overview

This platform provides comprehensive manufacturing intelligence and quality assurance capabilities for biotech/pharma operations, featuring:

- **Real-time Manufacturing Oversight**: Live monitoring of batch execution, equipment status, and critical process parameters
- **AI-Powered Quality Management**: Intelligent workflows for deviations, investigations, CAPAs (Corrective and Preventive Actions), and change controls
- **Predictive Analytics**: Risk scoring analysis of historical and real-time MES data to predict quality issues and equipment failures (currently using deterministic heuristic formulas with ML training infrastructure available for future activation)
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
- Risk scoring for equipment failure prediction
- Quality risk assessment for proactive management
- Trend analysis and pattern recognition
- Model performance metrics tracking (AUROC, Brier, ECE)
- Automated deviation risk assessment
- **Note**: Current implementation uses deterministic heuristic formulas; comprehensive ML training infrastructure (logistic regression) is implemented but not activated by default

### 5. Audit & Compliance
- Tamper-evident audit trail with SHA-256 hash chain verification
- AI interaction logging for transparency
- Evidence package export (FDA-ready)
- Archive validation with WORM-like semantics
- Complete ALCOA+ data integrity

### 6. Operations Assistant
- AI-powered copilot for manufacturing operations (**requires external LLM provider configuration**)
- Natural language queries for data insights
- Contextual recommendations
- Integrated with quality workflows
- Falls back to snapshot summaries when LLM unavailable

## AI Functionality

The BioPharm GMP Intelligence Platform integrates AI automation and decision support capabilities designed specifically for pharmaceutical manufacturing. All AI functionality is built with regulatory compliance, transparency, and human-in-the-loop controls as core principles.

### AI Components Overview

The platform includes AI-driven systems with distinct purposes and implementations:

#### 1. Operations Assistant (LLM-Powered Copilot) - **Requires External LLM Configuration**

**File:** `src/components/OperationsAssistant.tsx`  
**AI Engine:** `src/lib/spark.ts`, `src/lib/llmGatewayProvider.ts` (preferred)

The Operations Assistant is an AI-powered copilot architecture that provides natural language insights into manufacturing operations. **Critical requirement**: It requires configuration of an external Large Language Model (LLM) provider to function - it does NOT work out-of-the-box.

**Key Capabilities (when LLM configured):**
- **Contextual Query Processing**: Answers questions based on real-time operations snapshot including batches, equipment telemetry, quality records, alerts, and prediction metrics
- **Data Grounding**: Every response is grounded in structured data (JSON) from the platform's KV store and equipment feed
- **Conversation History**: Maintains up to 50 messages for context-aware interactions
- **Audit Logging**: All prompts and responses are logged to the AI Audit Trail for transparency
- **Graceful Degradation**: When LLM is unavailable, provides snapshot summary with explicit notification (fallback mode)

**LLM Provider Requirement**: ⚠️ **Requires one of the following**:
1. GitHub Spark Runtime (when running in GitHub Spark environment)
2. LLM Gateway endpoint (Azure OpenAI, AWS Bedrock, or custom) via `VITE_LLM_GATEWAY_ENDPOINT` environment variable
3. On-premise LLM server configured

Without LLM configuration, the Operations Assistant displays raw operational snapshots without natural language processing.

**Data Sources:**
```typescript
// From src/hooks/use-operations-assistant.ts
const digest: OperationsDigest = {
  summary: string,           // Plain text summary
  metrics: {
    batchYield: number,
    firstPassRate: number,
    deviationRate: number,
    averageDeviationRisk: number,
    equipmentOee: number,
    averageCompliance: number
  },
  batches: { /* batch status, progress, risks */ },
  equipment: { /* equipment status, risks */ },
  qualityRecords: { /* deviations, CAPAs, change controls */ },
  alerts: { /* active alerts by severity */ },
  automation: { /* automation queue status */ },
  modelPerformance: { /* AUROC, Brier, ECE metrics from heuristic formulas */ }
}
```

**LLM Integration Architecture:**
The platform uses an abstraction layer that supports multiple LLM deployment modes:
- **GitHub Spark Runtime** (`src/lib/spark.ts`): Default integration when running in GitHub Spark environment
- **LLM Gateway** (`src/lib/llmGatewayProvider.ts`): Cloud‑ or on‑prem gateway with configurable endpoint, token, and model (legacy `onPrem` provider kept for compatibility)
- **Development Mock** (`src/lib/devSparkMock.ts`): Deterministic responses for testing without external LLM

**Prompt Structure:**
```typescript
// From src/components/OperationsAssistant.tsx (lines 93-100)
const prompt = spark.llmPrompt`
  You are the "Operations Copilot" for a GMP manufacturing command center. 
  Answer precisely with metrics and concise actions.

  OPERATIONS SNAPSHOT (UTC ${digest.updatedAt.toISOString()}):
  ${latestSummary}

  STRUCTURED DATA (JSON):
  ${JSON.stringify({ metrics, batches, equipment, qualityRecords, alerts, automation, modelPerformance })}
`
```

#### 2. Quality Automation Engine

**File:** `src/lib/qualityAutomation.ts`  
**Type Definitions:** `src/types/automation.ts`

The Quality Automation Engine monitors batch execution in real-time and automatically detects quality events that may require human intervention. It generates non-binding suggestions for deviations based on statistical analysis of Critical Process Parameters (CPPs).

**Automation Triggers:**

1. **OOS (Out of Specification)**
   - Triggered when a parameter breaches specification limits
   - Requires 3 consecutive measurements outside bounds (configurable via `OOS_REQUIRED_STREAK`)
   - Severity assigned based on magnitude of deviation
   ```typescript
   // From src/lib/qualityAutomation.ts (lines 58-67)
   const determineSeverity = (trigger: AutomationTrigger, deviationMagnitude: number, range: number) => {
     const ratio = range === 0 ? deviationMagnitude : Math.abs(deviationMagnitude) / range
     if (trigger === 'OOS') {
       if (ratio > 0.75) return 'critical'  // >75% of range
       if (ratio > 0.5) return 'high'       // >50% of range
       return 'medium'
     }
     // OOT events are cautionary
     if (ratio > 0.6) return 'high'
     return 'medium'
   }
   ```

2. **OOT (Out of Trend)**
   - Triggered by sustained drift toward specification limits
   - Requires 6 consecutive measurements trending in same direction (configurable via `OOT_REQUIRED_COUNTER`)
   - Enables proactive intervention before OOS occurs

**Event Cadence Control:**
- Cooldown period of 5 real minutes between same-parameter events (`EVENT_COOLDOWN_MS`)
- Prevents alert fatigue from rapid-fire notifications
- Implemented via timestamp tracking in `eventCadence` Map

**Automation Workflow:**
```
Digital Twin Tick → Quality Automation Monitor
    ↓
CPP Analysis (Temperature, Pressure, pH, Volume)
    ↓
Trigger Detection (OOS/OOT)
    ↓
Deviation Record Creation
    ↓
AutomationSuggestion Generation
    ↓
Append to automation-queue (KV store)
    ↓
Human Review via AutomationBridge component
    ↓
Accept (→ Quality Management) or Dismiss
```

**Assignee Recommendation:**
```typescript
// From src/lib/qualityAutomation.ts (lines 70-75)
const recommendedAssignee = (parameter: string) => {
  if (parameter === 'temperature' || parameter === 'pressure') return 'Engineering'
  if (parameter === 'pH') return 'Process Development'
  if (parameter === 'volume') return 'Manufacturing'
  return 'Quality Assurance'
}
```

#### 3. Predictive Analytics Models

**File:** `src/lib/modeling.ts`  
**Model Monitoring:** `src/components/ModelMetricsSampler.tsx`

The platform includes three risk scoring functions for proactive quality management:

**Important Note**: These are currently **deterministic heuristic formulas**, not machine-learned models. However, comprehensive ML training infrastructure (logistic regression with gradient descent, feature standardization, and L2 regularization) is fully implemented in the same file (lines 266-341) and can be activated to replace the heuristics with learned models.

**Scoring Function Types:**
```typescript
// From src/lib/modeling.ts (line 3)
export type ModelId = 'quality_prediction' | 'equipment_failure' | 'deviation_risk'
```

**A. Quality Prediction Function**

Calculates probability that all Critical Process Parameters will remain within specification using a deterministic formula.

```typescript
// From src/lib/modeling.ts (lines 107-119)
export function predictQuality(batch: BatchData) {
  const cpp = getCPPCompliance(batch) // [0,1]
  // Deterministic heuristic formula (not learned from data)
  const p = clamp(0.05 + 0.9 * cpp, 0, 1)
  const features: Features = {
    cpp_compliance: cpp,
    temp_delta: Math.abs(batch.parameters.temperature.current - batch.parameters.temperature.target),
    pressure_delta: Math.abs(batch.parameters.pressure.current - batch.parameters.pressure.target),
    ph_delta: Math.abs(batch.parameters.pH.current - batch.parameters.pH.target),
  }
  const y = outcomeQuality(batch)
  return { p, y, features }
}
```

**Decision Threshold:** 0.95 (strict threshold since y=1 means all CPPs in spec)  
**Implementation**: Fixed formula, not learned parameters (ML training infrastructure available in lines 266-341)

**B. Equipment Failure Prediction Function**

Calculates equipment failure risk probability based on telemetry data using a deterministic weighted formula.

```typescript
// From src/lib/modeling.ts (lines 155-176)
export function predictEquipmentFailure(eq: EqT) {
  const rms = eq.vibrationRMS
  const rmsN = clamp(rms / 6, 0, 1) // Normalize to [0,1]
  const tvarN = clamp(eq.temperatureVar / 0.6, 0, 1)
  
  // Fixed weighted combination (not learned from data)
  const raw = 0.6 * rmsN + 0.3 * tvarN + (eq.vibrationAlert ? 0.2 : 0)
  const p = clamp(raw, 0, 1)
  
  const features: Features = {
    rms: rms,
    rms_norm: rmsN,
    temp_var: eq.temperatureVar,
    temp_var_norm: tvarN,
    alert_flag: eq.vibrationAlert ? 1 : 0,
  }
  const y = outcomeEquipment(eq)
  return { p, y, features }
}
```

**Decision Threshold:** 0.5  
**Implementation**: Fixed weights (0.6, 0.3, 0.2), not learned from training data

**C. Deviation Risk Function**

Calculates likelihood of deviation based on maximum normalized distance from specification mid-point using a deterministic formula.

```typescript
// From src/lib/modeling.ts (lines 125-142)
export function predictDeviationRisk(batch: BatchData) {
  const { cppBounds: s, parameters: p } = batch
  const norm = (val: number, min: number, max: number) => 
    Math.abs(val - (min + max) / 2) / ((max - min) / 2)
  const devs = [
    norm(p.temperature.current, s.temperature.min, s.temperature.max),
    norm(p.pressure.current, s.pressure.min, s.pressure.max),
    norm(p.pH.current, s.pH.min, s.pH.max),
  ]
  // Deterministic max deviation formula (not learned)
  const risk = clamp(Math.max(...devs), 0, 2) / 2 // map to [0,1]
  const features: Features = {
    temp_norm_dev: devs[0],
    pressure_norm_dev: devs[1],
    ph_norm_dev: devs[2],
  }
  const y = outcomeDeviation(batch)
  return { p: risk, y, features }
}
```

**Decision Threshold:** 0.5  
**Implementation**: Max deviation heuristic, not learned from data

**Prediction Performance Monitoring:**

The platform implements comprehensive monitoring infrastructure using industry-standard metrics (currently measuring heuristic formula performance, ready to measure ML model performance when activated):

```typescript
// From src/lib/modeling.ts (lines 29-48)
metrics(model: ModelId, opts?: { 
  threshold?: number; 
  minN?: number; 
  requireBothClasses?: boolean 
}) {
  const t = opts?.threshold ?? 0.5
  const minN = opts?.minN ?? 1
  const needBoth = opts?.requireBothClasses ?? false
  const rs = this.getRecords(model)
  const n = rs.length
  
  // Performance metrics (applies to both heuristic formulas and ML models)
  const accuracy = preds.filter(x => x.c === x.y).length / n
  const brier = rs.reduce((s, r) => s + (r.p - r.y) * (r.p - r.y), 0) / n
  const ece = expectedCalibrationError(rs, 5)
  const auroc = computeAUROC(rs)
  
  return { n, accuracy, brier, ece, auroc, threshold: t, hasPosNeg }
}
```

**Metrics Explained:**
- **AUROC (Area Under ROC Curve)**: Measures ability to distinguish between positive and negative outcomes. Range [0,1], higher is better. Target: ≥0.75
- **Brier Score**: Measures calibration accuracy of probabilistic predictions. Range [0,1], lower is better. Target: ≤0.20
- **ECE (Expected Calibration Error)**: Measures how well predicted probabilities match observed frequencies. Range [0,1], lower is better. Target: ≤0.10
- **Accuracy**: Percentage of correct classifications (when predictions are thresholded). Only reported when sufficient samples exist

**Note**: These metrics currently measure the performance of the deterministic heuristic formulas. The same infrastructure will automatically measure ML model performance when training is activated.

**Monitoring Workflow:**
```
Batch/Equipment Data → Predict (p, features) [using heuristic formula]
    ↓
Record Prediction with PredictionRecord
    ↓
Add to ModelMonitor singleton
    ↓
Periodic Sampling (ModelMetricsSampler)
    ↓
Calculate AUROC/Brier/ECE
    ↓
Persist to KV store (model-metrics-{modelId})
    ↓
Display in AI Audit Trail and Analytics
```

#### 4. AI Audit Trail and Transparency

**Files:** `src/components/AIAuditTrail.tsx`, `src/hooks/use-audit.ts`

Every AI interaction is logged for regulatory compliance and transparency.

**Logged Events:**
- **AI Assistant Prompts**: User questions to Operations Assistant (first 400 chars)
- **AI Assistant Responses**: LLM responses (first 1200 chars)
- **AI Fallback**: When LLM unavailable, logs fallback response
- **Model Predictions**: Via ModelMetricsSampler, logs prediction outcomes
- **Automation Suggestions**: Quality automation proposals and decisions

**Audit Record Structure:**
```typescript
// From src/hooks/use-audit.ts
{
  timestamp: Date,
  userId: string,
  action: string,         // e.g., "AI Assistant Prompt"
  module: 'ai',
  details: string,        // Prompt/response content
  recordId?: string,
  outcome?: 'success' | 'failure' | 'pending'
}
```

**AI Audit Trail Features:**
- **Conversation Archive**: Full history of Operations Assistant interactions
- **Export Capability**: Export as JSON or CSV for regulatory review
- **Model Metrics Display**: Real-time AUROC, Brier, ECE charts
- **Searchable**: Filter by date, action, module
- **Hash Chain Integrity**: When backend enabled, provides tamper detection

### AI Architecture Principles

**1. Human-in-the-Loop**
- All AI outputs are suggestions, not automated decisions
- Quality automation requires human acceptance via AutomationBridge
- Operations Assistant provides insights, but humans make final decisions
- Model predictions inform risk scoring but don't auto-reject batches

**2. Transparency and Explainability**
- Full audit trail of all AI interactions
- Model performance metrics visible in real-time
- Feature values logged with predictions
- Prompt and response content preserved

**3. Regulatory Compliance**
- FDA 7-Step Risk-Based Credibility Assessment implemented (see `docs/ai-credibility-assessment.md`)
- ALCOA+ data integrity principles applied to AI logs
- 21 CFR Part 11 compliance for electronic records
- Evidence package export for regulatory submissions

**4. Deployment Flexibility**
- **LLM Gateway (cloud or on-prem)**: Configure via `VITE_LLM_GATEWAY_ENDPOINT` for gateway-hosted LLMs (legacy `VITE_ONPREM_LLM_ENDPOINT` supported)
- **Cloud LLM**: Use GitHub Spark or other cloud providers
- **Air-Gapped**: Development mock for environments without internet

**5. Model Credibility Goals**
- AUROC ≥ 0.75 for all models (target threshold)
- Brier Score ≤ 0.20 for calibration quality
- ECE ≤ 0.10 for probability calibration
- Graceful degradation with missing data

### AI and Digital Twin Integration

**File:** `src/lib/digitalTwin.ts`

The Digital Twin serves dual purposes:
1. **Development/Testing**: Simulated manufacturing environment for AI training and testing
2. **AI Trigger Source**: Generates realistic CPP drift and equipment events to exercise quality automation

**Integration Flow:**
```
Digital Twin Tick (every 2 seconds by default)
    ↓
Update Batch Parameters with Gaussian Noise
    ↓
Update Equipment Telemetry
    ↓
Publish TwinSnapshot to subscribers
    ↓
Quality Automation Engine receives snapshot
    ↓
Analyzes CPPs for OOS/OOT triggers
    ↓
Model Predictions sampled (every 30 sim seconds)
    ↓
Operations Assistant digest updated
```

**Simulation Controls:**
```typescript
// From src/lib/digitalTwin.ts (lines 14-18)
export type TwinOptions = {
  tickMs: number,                  // Real-time interval (default: 2000ms)
  simSecondsPerTick: number,       // Simulated seconds per tick (default: 60)
  monitorEverySimSeconds: number   // Prediction sampling interval (default: 30)
}
```

## Architecture

### System Architecture

The BioPharm GMP Intelligence Platform is a modern web application built with a React frontend and optional Node.js backend for enterprise features.

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        Dashboard["Dashboard<br/>Monitoring"]
        Quality["Quality<br/>Management"]
        Analytics["Analytics<br/>Predictive"]
        ComponentLib["Component Library<br/>(Radix UI + Tailwind)"]
        DigitalTwin["Digital Twin<br/>Simulation"]
        QualityAuto["Quality<br/>Automation"]
        ModelEngine["Modeling<br/>Engine"]
        
        Dashboard -.-> ComponentLib
        Quality -.-> ComponentLib
        Analytics -.-> ComponentLib
        DigitalTwin -.-> ComponentLib
        QualityAuto -.-> ComponentLib
        ModelEngine -.-> ComponentLib
    end
    
    subgraph Backend["Backend (Express.js - Optional)"]
        AuditStore["Audit Store<br/>(JSONL + Hash Chain)"]
        MetricsStore["Metrics Store<br/>(Time-Series Logging)"]
        Archive["Archive<br/>(WORM-like)"]
    end
    
    subgraph External["External Integrations (Production)"]
        OPCUA["OPC UA<br/>Equipment Data"]
        MES["MES<br/>Batch Data"]
        Historian["Historian<br/>Process Data"]
    end
    
    Frontend -->|REST API| Backend
    Backend --> External
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

### Local Dev — Full-stack UI test

To exercise the full stack locally (frontend + backend API + example gateway handlers):

1. Start the backend API (this mounts the local API used by the SPA):

```bash
# Terminal A
npm run server
```

2. Start the Vite frontend dev server (it will proxy `/api` to the backend):

```bash
# Terminal B
npm run dev
```

3. Verify the backend health endpoint directly:

```bash
curl -sS http://localhost:5000/api/health | jq || true
```

4. Verify the frontend dev server is proxying to the API (Vite may choose a different port if 5173/5000 are in use):

```bash
# Replace PORT with the port printed by `npm run dev` (usually 5173 or 3000)
curl -sS http://localhost:5173/api/health | jq || true
```

5. Example gateway handlers live in `examples/` and are documented in `examples/README.md`.
  To use them, mount the router into your server (see `server/index.mjs`) or adapt to your framework.

If you want, I can also add a small script that mounts the example gateway routers into the local API during development.

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

**Important**: The deployment configurations provided are comprehensive starting templates for reference. Production deployments should be reviewed and customized for your organization's:
- Security requirements and compliance policies (IAM roles, network segmentation, encryption standards)
- Network architecture and firewall rules
- Backup, disaster recovery, and business continuity procedures
- Monitoring, alerting, and observability thresholds
- Cost optimization strategies and resource sizing
- Regulatory compliance requirements (GxP, HIPAA, SOC2, etc.)

The scripts and configurations have been designed following cloud provider best practices but require validation and adjustment for production workloads.

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
│   │   ├── llmGatewayProvider.ts # LLM gateway (cloud or on-prem)
│   │   ├── onPremSparkProvider.ts # legacy on-prem provider (kept for compatibility)
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

Risk scoring analysis for quality prediction and equipment failure detection (currently using deterministic heuristic formulas).

**File:** `src/components/Analytics.tsx`

**Prediction Performance Metrics:**

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
      {/* These metrics currently measure heuristic formula performance */}
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

The platform includes three risk scoring functions for proactive quality management.

**File:** `src/lib/modeling.ts`

**Important**: Current implementation uses **deterministic heuristic formulas**. Comprehensive ML training infrastructure (logistic regression) is implemented in the same file (lines 266-341) but not activated by default.

### Function Types

```typescript
export type ModelId = 'quality_prediction' | 'equipment_failure' | 'deviation_risk'
```

### Quality Prediction Function

Calculates probability that all Critical Process Parameters will remain in specification using a fixed formula:

```typescript
import { predictQuality, decisionThreshold } from '@/lib/modeling'

function checkBatchQuality(batch: BatchData) {
  const prediction = predictQuality(batch)  // Uses formula: p = 0.05 + 0.9 * cpp
  
  return {
    probability: prediction.p,
    inSpec: prediction.p >= decisionThreshold.quality_prediction,
    features: prediction.features,
    confidence: Math.abs(prediction.p - 0.5) * 2  // 0 to 1
  }
}
```

### Equipment Failure Prediction Function

Calculates equipment failure risk based on telemetry using fixed weights:

```typescript
import { predictEquipmentFailure, decisionThreshold } from '@/lib/modeling'

function monitorEquipment(equipment: EquipmentTelemetry) {
  const prediction = predictEquipmentFailure(equipment)  // Uses fixed weights: 0.6*rms + 0.3*temp_var + 0.2*alert
  
  if (prediction.p > decisionThreshold.equipment_failure) {
    // High risk - generate alert
    createMaintenanceAlert(equipment.id, prediction.p)
  }
}
```

### Prediction Monitor

Centralized monitoring of prediction performance (works for both heuristic formulas and ML models):

```typescript
import { monitor } from '@/lib/modeling'

// Add a prediction record (same for heuristic or ML)
monitor.add({
  id: 'pred-001',
  model: 'quality_prediction',
  timestamp: Date.now(),
  p: 0.85,  // Predicted probability [0,1] from heuristic formula
  y: 1,     // Observed outcome (0 or 1)
  features: {
    temperature: 37.2,
    pressure: 1.8,
    pH: 7.1,
    batchAge: 48
  }
})

// Get performance metrics (measures heuristic formula performance currently)
const metrics = monitor.metrics('quality_prediction', {
  threshold: 0.95,
  minN: 10,
  requireBothClasses: true
})
```

## AI Workflows and Data Flows

This section provides detailed documentation of how AI components interact with data sources and each other within the platform.

### Workflow 1: Operations Assistant Query Processing

**End-to-End Flow:**

```
User Input (Natural Language Query)
    ↓
[OperationsAssistant Component]
    ↓
useOperationsAssistant Hook
    │
    ├─→ Subscribe to TwinSnapshot (Digital Twin)
    ├─→ Fetch Quality Records (deviations, CAPAs, change controls)
    ├─→ Fetch Alerts (useAlerts hook)
    ├─→ Fetch Automation Queue
    ├─→ Fetch Model Metrics (ModelMonitor)
    │
    ↓
Build OperationsDigest
    │
    ├─→ Compute batch metrics (yield, first-pass rate, deviation rate)
    ├─→ Compute equipment metrics (OEE, top risks)
    ├─→ Compute quality metrics (open deviations, CAPAs)
    ├─→ Aggregate model performance (AUROC, Brier, ECE)
    │
    ↓
Generate Summary Text + Structured JSON
    ↓
[Spark LLM Interface]
    │
    ├─→ GitHub Spark Runtime (if available)
    ├─→ LLM Gateway (cloud or on-premise) (if configured)
    ├─→ Fallback (summary only, no LLM)
    │
    ↓
Format Prompt with Context
    ↓
Send to LLM
    ↓
Receive Response
    ↓
[Audit Logger]
    ├─→ Log Prompt (action: "AI Assistant Prompt", module: "ai")
    ├─→ Log Response (action: "AI Assistant Response", module: "ai")
    │
    ↓
Display to User
    ↓
Append to Conversation History (max 50 messages)
```

**Data Flow Diagram:**

```mermaid
graph TD
    DataSources["Data Sources (KV Store)<br/>• batches[]<br/>• equipment-telemetry[]<br/>• deviations[]<br/>• capas[]<br/>• change-controls[]<br/>• automation-queue[]<br/>• alerts[]<br/>• model-metrics-*"]
    
    Hook["useOperationsAssistant Hook<br/>(Aggregation & Computation)"]
    
    Digest["OperationsDigest<br/>• summary (text)<br/>• metrics (computed KPIs)<br/>• batches (aggregated)<br/>• equipment (top risks)<br/>• qualityRecords (counts)<br/>• alerts (by severity)<br/>• automation (queue status)<br/>• modelPerformance (metrics)"]
    
    PromptConstruct["LLM Prompt Construction<br/>'You are Operations Copilot...'<br/>+ Snapshot Summary<br/>+ Structured JSON"]
    
    Spark["GitHub Spark<br/>Runtime"]
    OnPrem["LLM Gateway<br/>(HTTP POST - cloud or on-prem)"]
    
    Response["LLM Response"]
    
    Audit["Audit<br/>Logger"]
    Display["Display to<br/>User (UI)"]
    
    DataSources --> Hook
    Hook --> Digest
    Digest --> PromptConstruct
    PromptConstruct --> Spark
    PromptConstruct --> OnPrem
    Spark --> Response
    OnPrem --> Response
    Response --> Audit
    Response --> Display
```

**File References:**
- **User Interface**: `src/components/OperationsAssistant.tsx` (lines 1-200+)
- **Data Aggregation**: `src/hooks/use-operations-assistant.ts` (lines 1-300+)
- **LLM Interface**: `src/lib/spark.ts` (lines 1-10)
- **LLM Gateway Provider**: `src/lib/llmGatewayProvider.ts` (preferred). Legacy: `src/lib/onPremSparkProvider.ts` (lines 1-51)
- **Audit Logging**: `src/hooks/use-audit.ts`

### Workflow 2: Quality Automation Trigger Detection

**End-to-End Flow:**

```
Digital Twin Tick (every tickMs)
    ↓
Generate TwinSnapshot
    │
    ├─→ batches[] (updated parameters with noise)
    ├─→ equipmentTelemetry[] (updated metrics)
    │
    ↓
Notify Subscribers
    ↓
[Quality Automation Engine]
    ↓
FOR EACH Batch:
    FOR EACH Parameter (temperature, pressure, pH, volume):
        │
        ├─→ Extract current value, target, bounds
        ├─→ Calculate deviation
        ├─→ Calculate compliance
        │
        ├─→ CHECK OOS (Out of Specification):
        │   │
        │   ├─→ Is value outside bounds?
        │   │   ├─→ NO: Reset OOS streak counter
        │   │   ├─→ YES: Increment OOS streak counter
        │   │           │
        │   │           ├─→ Streak ≥ OOS_REQUIRED_STREAK (3)?
        │   │               ├─→ YES: TRIGGER OOS Event
        │   │               └─→ NO: Continue monitoring
        │   │
        │   └─→ OOS EVENT TRIGGERED:
        │       │
        │       ├─→ Check cooldown (last event < 5 min ago?)
        │       │   ├─→ YES: Skip (prevent alert fatigue)
        │       │   └─→ NO: Continue
        │       │
        │       ├─→ Create Deviation Record
        │       │   ├─→ ID: DEV-{timestamp}-{batch}-{param}-OOS-{random}
        │       │   ├─→ Severity: determineSeverity(deviation, range)
        │       │   ├─→ Assignee: recommendedAssignee(parameter)
        │       │   ├─→ Origin: "digital-twin"
        │       │   ├─→ Metadata: { trigger, parameter, values, bounds }
        │       │
        │       ├─→ Create AutomationSuggestion
        │       │   ├─→ ID: AUTO-{timestamp}-{random}
        │       │   ├─→ Actions: ["Investigate root cause", "Review trend", ...]
        │       │   ├─→ Status: "pending"
        │       │   ├─→ aiConfidence: "high" (OOS is definitive)
        │       │
        │       └─→ Append to automation-queue[] (KV store)
        │
        └─→ CHECK OOT (Out of Trend):
            │
            ├─→ Calculate trend direction (toward upper or lower bound)
            ├─→ Is trending toward bound?
            │   ├─→ NO: Reset OOT counter
            │   ├─→ YES: Increment OOT counter
            │           │
            │           ├─→ Counter ≥ OOT_REQUIRED_COUNTER (6)?
            │               ├─→ YES: TRIGGER OOT Event
            │               └─→ NO: Continue monitoring
            │
            └─→ OOT EVENT TRIGGERED:
                │
                ├─→ Check cooldown (same as OOS)
                │
                ├─→ Create Deviation Record (severity: medium/high)
                │
                ├─→ Create AutomationSuggestion
                │   ├─→ aiConfidence: "medium" (trend-based, not definitive)
                │
                └─→ Append to automation-queue[]
    
Display in AutomationBridge Component
    ↓
Human Review
    │
    ├─→ ACCEPT:
    │   ├─→ Move Deviation to Quality Management
    │   ├─→ Update suggestion status: "accepted"
    │   ├─→ Remove from automation-queue
    │   └─→ Log audit event
    │
    └─→ DISMISS:
        ├─→ Update suggestion status: "dismissed"
        ├─→ Log reason and signature
        ├─→ Remove from automation-queue
        └─→ Log audit event
```

**Data Flow Diagram:**

```mermaid
graph TD
    Twin["Digital Twin<br/>(src/lib/digitalTwin.ts)<br/>Generates TwinSnapshot every tickMs (default 2s)"]
    
    QA["Quality Automation Engine<br/>(src/lib/qualityAutomation.ts)<br/><br/>initializeQualityAutomation()<br/>└─→ subscribeToTwin(listener)<br/><br/>For each batch parameter:<br/>├─→ checkOOSCondition(streak ≥ 3)<br/>└─→ checkOOTCondition(counter ≥ 6)<br/><br/>State Maps:<br/>• oosStreaks: Map&lt;key, number&gt;<br/>• trendState: Map&lt;key, {lastValue, counter}&gt;<br/>• eventCadence: Map&lt;key, timestamp&gt;<br/>• activeTriggers: Map&lt;key, deviationId&gt;"]
    
    KV["KV Store: automation-queue[]<br/>[{<br/>id: 'AUTO-...',<br/>deviationId: 'DEV-...',<br/>trigger: 'OOS' | 'OOT',<br/>parameter: 'temperature' | 'pressure' | ...,<br/>summary: 'Temperature OOS detected...',<br/>actions: ['Investigate...', 'Review...'],<br/>assignee: 'Engineering',<br/>status: 'pending',<br/>aiConfidence: 'high' | 'medium',<br/>measurement: { currentValue, target, bounds }<br/>}]"]
    
    Bridge["AutomationBridge Component<br/>(src/components/AutomationBridge.tsx)<br/><br/>Display pending suggestions<br/>├─→ Show trigger type, parameter, severity<br/>├─→ Show current value vs bounds<br/>├─→ Show recommended actions<br/>└─→ Show AI confidence level<br/><br/>User Actions:<br/>├─→ Accept → Move to Quality Management<br/>└─→ Dismiss → Log reason, remove from queue"]
    
    Twin -->|"TwinSnapshot<br/>{timestamp, batches[], equipmentTelemetry[]}"| QA
    QA -->|AutomationSuggestion| KV
    KV -->|useKV subscription| Bridge
```

**Configuration Constants:**
```typescript
// From src/lib/qualityAutomation.ts (lines 39-44)
const OOS_REQUIRED_STREAK = 3        // Consecutive OOS measurements
const OOT_REQUIRED_COUNTER = 6       // Consecutive trending measurements
const EVENT_COOLDOWN_MS = 5 * 60 * 1000  // 5 minutes cooldown
```

**File References:**
- **Automation Engine**: `src/lib/qualityAutomation.ts` (lines 1-286)
- **Type Definitions**: `src/types/automation.ts` (lines 1-30)
- **UI Component**: `src/components/AutomationBridge.tsx`

### Workflow 3: Predictive Model Inference and Monitoring

**End-to-End Flow:**

```
Data Source (Batch or Equipment)
    ↓
Prediction Function Called
    │
    ├─→ predictQuality(batch)
    ├─→ predictEquipmentFailure(equipment)
    └─→ predictDeviationRisk(batch)
    │
    ↓
Extract Features
    │
    ├─→ Quality: cpp_compliance, temp_delta, pressure_delta, ph_delta
    ├─→ Equipment: vibration_rms, run_hours, utilization
    └─→ Deviation Risk: temp_norm_dev, pressure_norm_dev, ph_norm_dev
    │
    ↓
Compute Prediction Probability p ∈ [0,1]
    │
    ├─→ Apply model-specific logic (weighted combination, normalization)
    │
    ↓
Determine Ground Truth Outcome y ∈ {0,1}
    │
    ├─→ Quality: y=1 if all CPPs in spec, else y=0
    ├─→ Equipment: y=1 if alert present, else y=0
    └─→ Deviation Risk: y=1 if any CPP out of spec, else y=0
    │
    ↓
Return { p, y, features }
    ↓
[Optional: Record for Monitoring]
    ↓
ModelMonitor.add({
  id: unique-id,
  model: modelId,
  timestamp: Date.now(),
  p: probability,
  y: outcome,
  features: feature-map
})
    ↓
[Periodic Sampling via ModelMetricsSampler]
    │
    ├─→ Every 30 simulated seconds (configurable)
    ├─→ Call monitor.metrics(modelId, { threshold, minN, requireBothClasses })
    │
    ↓
Compute Performance Metrics
    │
    ├─→ AUROC = computeAUROC(predictions)
    │   │
    │   └─→ Rank predictions by probability
    │       └─→ Calculate area under ROC curve
    │           └─→ (sumPosRanks - nPos*(nPos+1)/2) / (nPos * nNeg)
    │
    ├─→ Brier Score = Σ(p - y)² / n
    │   │
    │   └─→ Measures squared error of probabilistic predictions
    │
    ├─→ ECE = expectedCalibrationError(predictions, bins=5)
    │   │
    │   └─→ Bin predictions into 5 equal-width bins
    │       └─→ For each bin: |avg_predicted - avg_actual|
    │           └─→ Weighted average across bins
    │
    └─→ Accuracy = correct_predictions / total_predictions
        │
        └─→ Only computed if n ≥ minN and both classes present
    │
    ↓
Persist Metrics to KV Store
    │
    └─→ Key: "model-metrics-{modelId}"
        └─→ Value: { timestamp, n, accuracy, brier, ece, auroc, threshold }
    │
    ↓
Display in UI
    │
    ├─→ AI Audit Trail: Charts of AUROC, Brier, ECE over time
    └─→ Analytics: Model performance cards with latest metrics
```

**AUROC Calculation Details:**

```typescript
// From src/lib/modeling.ts (lines 79-102)
function computeAUROC(rs: PredictionRecord[]) {
  const pos = rs.filter(r => r.y === 1)  // Positive outcomes
  const neg = rs.filter(r => r.y === 0)  // Negative outcomes
  const nPos = pos.length
  const nNeg = neg.length
  
  if (nPos === 0 || nNeg === 0) return 0  // Need both classes
  
  // Sort all predictions by probability (ascending)
  const sorted = rs.slice().sort((a, b) => a.p - b.p)
  
  // Assign ranks (1-indexed), averaging for ties
  const ranks: number[] = new Array(sorted.length)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1].p === sorted[i].p) j++
    const avgRank = (i + j + 2) / 2  // Average rank for tied predictions
    for (let k = i; k <= j; k++) ranks[k] = avgRank
    i = j + 1
  }
  
  // Sum ranks for positive outcomes
  let sumPosRanks = 0
  for (let idx = 0; idx < sorted.length; idx++) {
    if (sorted[idx].y === 1) sumPosRanks += ranks[idx]
  }
  
  // Calculate AUC using rank-sum formula
  const auc = (sumPosRanks - (nPos * (nPos + 1)) / 2) / (nPos * nNeg)
  return auc
}
```

**Data Flow Diagram:**

```mermaid
graph TD
    Data["Batch/Equipment Data Source<br/>• BatchData from TwinSnapshot or Equipment Feed<br/>• EquipmentTelemetry from Digital Twin"]
    
    Predictions["Prediction Functions<br/>(src/lib/modeling.ts)<br/><br/>predictQuality(batch)<br/>└─→ cpp_compliance = getCPPCompliance(batch)<br/>└─→ p = clamp(0.05 + 0.9 * cpp, 0, 1)<br/>└─→ y = (cpp === 1) ? 1 : 0<br/><br/>predictEquipmentFailure(equipment)<br/>└─→ vibrationScore + runtimeScore + utilizScore<br/>└─→ p = weighted combination<br/>└─→ y = (alert present) ? 1 : 0<br/><br/>predictDeviationRisk(batch)<br/>└─→ normalized deviations from mid-spec<br/>└─→ p = max(devs) / 2<br/>└─→ y = (any CPP out of spec) ? 1 : 0"]
    
    Monitor["ModelMonitor Singleton<br/>(src/lib/modeling.ts)<br/><br/>private records: PredictionRecord[] = []<br/><br/>add(record: PredictionRecord)<br/>└─→ records.push(record)<br/><br/>metrics(model, opts)<br/>├─→ Filter records by model<br/>├─→ Compute AUROC (rank-based)<br/>├─→ Compute Brier (MSE of probabilities)<br/>├─→ Compute ECE (calibration bins)<br/>└─→ Compute Accuracy (if n ≥ minN)"]
    
    Sampler["ModelMetricsSampler Component<br/>(src/components/ModelMetricsSampler.tsx)<br/><br/>useEffect(() => {<br/>const interval = setInterval(() => {<br/>for (model of ['quality_prediction',<br/>'equipment_failure',<br/>'deviation_risk']) {<br/>const metrics = monitor.metrics(model, opts)<br/>setKV(`model-metrics-$${model}`, {<br/>timestamp: Date.now(),<br/>...metrics<br/>})<br/>}<br/>}, samplingInterval)<br/>}, [])"]
    
    KVStore["KV Store: model-metrics-*<br/>{<br/>timestamp: number,<br/>n: number, // Sample count<br/>accuracy: number?, // Classification accuracy<br/>brier: number, // Brier score (calibration)<br/>ece: number, // Expected calibration error<br/>auroc: number, // Area under ROC curve<br/>threshold: number, // Decision threshold<br/>hasPosNeg: boolean // Both classes present?<br/>}"]
    
    UI["UI Display<br/><br/>AI Audit Trail Page:<br/>├─→ Line charts (AUROC, Brier, ECE over time)<br/>├─→ Threshold indicators<br/>└─→ Sample count display<br/><br/>Analytics Page:<br/>├─→ Model performance cards<br/>├─→ Latest metrics with color coding<br/>└─→ Historical trends"]
    
    Data -->|"{ p, y, features }"| Predictions
    Predictions --> Monitor
    Monitor -->|Periodic Sampling| Sampler
    Sampler -->|Persisted Metrics| KVStore
    KVStore -->|useKV subscription| UI
```

**Performance Thresholds:**
```typescript
// From docs/ai-credibility-assessment.md
Credibility Goals:
  - AUROC ≥ 0.75 (target for acceptance)
  - Brier ≤ 0.20 (good calibration)
  - ECE ≤ 0.10 (well-calibrated probabilities)
```

**File References:**
- **Prediction Functions**: `src/lib/modeling.ts` (lines 105-200)
- **Model Monitor**: `src/lib/modeling.ts` (lines 16-51)
- **Metrics Sampler**: `src/components/ModelMetricsSampler.tsx`
- **Metrics Display**: `src/components/AIAuditTrail.tsx`, `src/components/Analytics.tsx`

### Workflow 4: Equipment Feed Integration

**End-to-End Flow:**

```
Equipment Data Source
    │
    ├─→ Development: Digital Twin (src/lib/digitalTwin.ts)
    ├─→ Production: OPC UA / MES / Historian
    │
    ↓
Equipment Feed Abstraction Layer
(src/lib/equipmentFeed.ts)
    │
    ├─→ registerEquipmentFeed({ subscribe })
    │   └─→ Custom adapter implementation
    │
    ├─→ ensureEquipmentFeed()
    │   └─→ Initialize default feed if none registered
    │
    └─→ subscribeToEquipmentFeed(listener)
        └─→ Notify listener on every snapshot
    │
    ↓
Snapshot Format
{
  timestamp: Date,
  batches: BatchData[],
  equipmentTelemetry: EquipmentTelemetry[]
}
    ↓
Subscribers (Components/Hooks)
    │
    ├─→ Dashboard: Display equipment status, batch progress
    ├─→ Quality Automation: Monitor CPPs for OOS/OOT
    ├─→ Operations Assistant: Aggregate for digest
    ├─→ Analytics: Compute metrics and predictions
    └─→ Model Sampler: Sample predictions for monitoring
```

**Production Integration Example (OPC UA):**

```typescript
// Custom OPC UA adapter (example from README)
import { registerEquipmentFeed } from '@/lib/equipmentFeed'
import { OPCUAClient } from 'node-opcua'

registerEquipmentFeed({
  subscribe: (listener) => {
    const client = new OPCUAClient()
    
    // Connect to OPC UA server
    client.connect('opc.tcp://plc.example.com:4840')
    
    // Subscribe to equipment nodes
    const subscription = client.createSubscription({
      requestedPublishingInterval: 1000,  // 1 second
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10
    })
    
    // Monitor CPP nodes and transform to platform snapshot format
    subscription.monitor([
      'ns=2;s=Bioreactor1.Temperature',
      'ns=2;s=Bioreactor1.Pressure',
      'ns=2;s=Bioreactor1.pH',
      // ... more nodes
    ], (dataValues) => {
      const snapshot = transformToSnapshot(dataValues)
      listener(snapshot)  // Notify platform
    })
    
    // Return cleanup function
    return () => {
      subscription.terminate()
      client.disconnect()
    }
  }
})
```

**File References:**
- **Equipment Feed Abstraction**: `src/lib/equipmentFeed.ts` (lines 1-81)
- **Digital Twin Implementation**: `src/lib/digitalTwin.ts` (lines 1-281)
- **Integration Guide**: `docs/equipment-integration.md`

## AI Use Cases and Examples

This section provides concrete, grounded examples of AI functionality in action, with references to actual code in the repository.

### Use Case 1: Querying Operations Assistant for Batch Status

**Scenario:** A manufacturing supervisor wants to know which batches are at highest risk of deviation.

**User Query:**
```
"Which batches have the highest deviation risk right now?"
```

**Operations Assistant Processing:**

1. **Digest Generation** (from `src/hooks/use-operations-assistant.ts`):
```typescript
// Lines 140-200: Build batch risk analysis
const topDeviationRisks = snapshot.batches
  .map(batch => ({
    id: batch.id,
    product: batch.product,
    stage: batch.currentStage,
    risk: predictDeviationRisk(batch).p * 100,  // Convert to percentage
    cppCompliance: getCPPCompliance(batch),
    status: batch.status,
    progress: batch.progress
  }))
  .sort((a, b) => b.risk - a.risk)  // Sort by risk descending
  .slice(0, 5)  // Top 5
```

2. **LLM Prompt** (from `src/components/OperationsAssistant.tsx`, lines 93-110):
```typescript
const prompt = spark.llmPrompt`
  You are the "Operations Copilot" for a GMP manufacturing command center.
  Answer precisely with metrics and concise actions.

  OPERATIONS SNAPSHOT (UTC ${digest.updatedAt.toISOString()}):
  ${latestSummary}

  STRUCTURED DATA (JSON):
  ${JSON.stringify({
    batches: {
      topDeviationRisks: [
        { id: "BTH-001", product: "Monoclonal Antibody", risk: 42.3, cppCompliance: 0.89 },
        { id: "BTH-003", product: "Vaccine", risk: 38.7, cppCompliance: 0.91 },
        { id: "BTH-005", product: "Cell Therapy", risk: 31.2, cppCompliance: 0.93 }
      ]
    }
  })}

  USER QUESTION: "Which batches have the highest deviation risk right now?"
`
```

3. **Expected LLM Response:**
```
The top 3 batches with highest deviation risk are:

1. **BTH-001** (Monoclonal Antibody) - 42.3% risk, 89% CPP compliance
2. **BTH-003** (Vaccine) - 38.7% risk, 91% CPP compliance  
3. **BTH-005** (Cell Therapy) - 31.2% risk, 93% CPP compliance

All three batches show moderate deviation risk due to parameters trending toward 
specification limits. Recommend monitoring temperature and pH closely for BTH-001.
```

4. **Audit Trail Entry:**
```typescript
// From src/components/OperationsAssistant.tsx, line 79
log('AI Assistant Prompt', 'ai', 'Which batches have the highest deviation risk right now?')

// Line 85
log('AI Assistant Response', 'ai', 'The top 3 batches with highest deviation risk are...')
```

**Code References:**
- Digest building: `src/hooks/use-operations-assistant.ts` (lines 140-200)
- Prompt construction: `src/components/OperationsAssistant.tsx` (lines 93-110)
- Audit logging: `src/components/OperationsAssistant.tsx` (lines 79, 85)

### Use Case 2: Accepting Quality Automation Suggestion

**Scenario:** The quality automation engine detects a temperature OOS event and suggests creating a deviation.

**Step 1: Automation Detection** (from `src/lib/qualityAutomation.ts`, lines 150-250)

```typescript
// Digital Twin tick detects batch BTH-042 temperature = 38.5°C (spec: 37.0 ± 1.0°C)
const batch = snapshot.batches.find(b => b.id === 'BTH-042')
const temp = batch.parameters.temperature

// Check if out of specification
if (temp.current < temp.min || temp.current > temp.max) {
  // Increment OOS streak
  oosStreaks.set('BTH-042-temperature', (oosStreaks.get('BTH-042-temperature') || 0) + 1)
  
  // Check if streak threshold met
  if (oosStreaks.get('BTH-042-temperature') >= OOS_REQUIRED_STREAK) {  // 3 consecutive
    // Create deviation
    const deviation: Deviation = {
      id: 'DEV-20251113210000-BTH-042-TEMPERATURE-OOS-123',
      title: 'Temperature OOS detected in BTH-042',
      description: 'Temperature measured 38.5°C vs target 37.0. Value breached specification limits.',
      severity: 'high',  // (38.5 - 38.0) / (38.0 - 36.0) = 0.25, so 'high'
      status: 'open',
      batchId: 'BTH-042',
      reportedBy: 'Digital Twin Monitor',
      reportedDate: new Date(),
      assignedTo: 'Engineering',  // recommendedAssignee('temperature')
      origin: 'digital-twin',
      metadata: {
        trigger: 'OOS',
        parameter: 'temperature',
        currentValue: 38.5,
        target: 37.0,
        bounds: { min: 36.0, max: 38.0 }
      }
    }
    
    // Create automation suggestion
    const suggestion: AutomationSuggestion = {
      id: 'AUTO-20251113210000-456',
      deviationId: deviation.id,
      trigger: 'OOS',
      parameter: 'temperature',
      summary: 'Temperature exceeded upper specification limit',
      actions: [
        'Investigate root cause of temperature spike',
        'Review bioreactor jacket temperature control',
        'Check for HVAC system anomalies',
        'Assess impact on product quality'
      ],
      assignee: 'Engineering',
      status: 'pending',
      createdAt: new Date().toISOString(),
      aiConfidence: 'high',
      measurement: {
        currentValue: 38.5,
        target: 37.0,
        bounds: { min: 36.0, max: 38.0 }
      }
    }
    
    // Append to automation queue
    appendToQueue(suggestion)
  }
}
```

**Step 2: User Review in AutomationBridge** (from `src/components/AutomationBridge.tsx`)

UI displays:
```
┌─────────────────────────────────────────────────────────┐
│ QUALITY AUTOMATION SUGGESTION                           │
├─────────────────────────────────────────────────────────┤
│ ID: AUTO-20251113210000-456                             │
│ Trigger: OOS (Out of Specification)                     │
│ Parameter: Temperature                                  │
│ Batch: BTH-042                                          │
│ Confidence: High                                        │
│                                                         │
│ Current Value: 38.5°C                                   │
│ Target: 37.0°C                                          │
│ Specification: 36.0 - 38.0°C                            │
│ Deviation: +0.5°C (25% of range)                        │
│                                                         │
│ Recommended Actions:                                    │
│ • Investigate root cause of temperature spike           │
│ • Review bioreactor jacket temperature control          │
│ • Check for HVAC system anomalies                       │
│ • Assess impact on product quality                      │
│                                                         │
│ Assigned To: Engineering                                │
│                                                         │
│ [Accept]  [Dismiss]                                     │
└─────────────────────────────────────────────────────────┘
```

**Step 3: Accept Suggestion**

```typescript
// User clicks "Accept"
const acceptSuggestion = (suggestion: AutomationSuggestion) => {
  // 1. Move deviation to quality management
  setDeviations(prev => [...prev, suggestion.proposedDeviation])
  
  // 2. Update suggestion status
  const updatedSuggestion = {
    ...suggestion,
    status: 'accepted' as const,
    resolvedAt: new Date().toISOString(),
    decision: 'accepted' as const,
    decisionBy: currentUser.name
  }
  
  // 3. Remove from automation queue
  setQueue(queue.filter(s => s.id !== suggestion.id))
  
  // 4. Log audit event
  log(
    'Accept Automation Suggestion',
    'automation',
    `Accepted suggestion ${suggestion.id} for deviation ${suggestion.deviationId}`,
    { suggestionId: suggestion.id, deviationId: suggestion.deviationId }
  )
}
```

**Result:** Deviation now appears in Quality Management system for formal investigation and resolution.

**Code References:**
- OOS detection: `src/lib/qualityAutomation.ts` (lines 150-250)
- Suggestion display: `src/components/AutomationBridge.tsx`
- Accept handler: `src/components/AutomationBridge.tsx` (accept button handler)

### Use Case 3: Monitoring Predictive Model Performance

**Scenario:** A data scientist wants to verify that the quality prediction model is well-calibrated.

**Step 1: Model Predictions** (continuous, from `src/lib/modeling.ts`)

```typescript
// Every 30 simulated seconds (via Digital Twin tick)
for (const batch of batches) {
  const prediction = predictQuality(batch)
  
  // Record prediction with ground truth
  monitor.add({
    id: `pred-quality-${Date.now()}-${Math.random()}`,
    model: 'quality_prediction',
    timestamp: Date.now(),
    p: prediction.p,        // e.g., 0.92
    y: prediction.y,        // e.g., 1 (all CPPs in spec)
    features: prediction.features
  })
}
```

**Step 2: Metrics Calculation** (from `src/components/ModelMetricsSampler.tsx`)

```typescript
// Periodic sampling (every 30 simulation seconds)
useEffect(() => {
  const interval = setInterval(() => {
    const metrics = monitor.metrics('quality_prediction', {
      threshold: 0.95,        // Decision threshold
      minN: 10,               // Minimum samples required
      requireBothClasses: true // Need both positive and negative outcomes
    })
    
    // Example metrics result:
    // {
    //   n: 150,                    // Total predictions
    //   accuracy: 0.867,           // 86.7% correct classifications
    //   brier: 0.045,              // Good calibration (< 0.20)
    //   ece: 0.032,                // Well-calibrated (< 0.10)
    //   auroc: 0.912,              // Excellent discrimination (> 0.75)
    //   threshold: 0.95,
    //   hasPosNeg: true
    // }
    
    setKV('model-metrics-quality_prediction', {
      timestamp: Date.now(),
      ...metrics
    })
  }, samplingInterval)
  
  return () => clearInterval(interval)
}, [])
```

**Step 3: View in AI Audit Trail** (from `src/components/AIAuditTrail.tsx`)

UI displays:
```
┌─────────────────────────────────────────────────────────┐
│ MODEL PERFORMANCE: Quality Prediction                   │
├─────────────────────────────────────────────────────────┤
│ Samples: 150                                            │
│ Decision Threshold: 0.95                                │
│                                                         │
│ AUROC (Discrimination):  ████████████████░░  0.912 ✓   │
│   Target: ≥ 0.75                                        │
│                                                         │
│ Brier Score (Calibration): ██░░░░░░░░░░░░  0.045 ✓     │
│   Target: ≤ 0.20                                        │
│                                                         │
│ ECE (Calibration Error):  ██░░░░░░░░░░░░░  0.032 ✓     │
│   Target: ≤ 0.10                                        │
│                                                         │
│ Accuracy:  ████████████████░░░  86.7% ✓                │
│                                                         │
│ Status: All metrics within acceptable range             │
│                                                         │
│ [View Calibration Plot] [Export Metrics]                │
└─────────────────────────────────────────────────────────┘
```

**Interpretation:**
- **AUROC 0.912**: Model has excellent ability to distinguish batches that will stay in spec from those that won't
- **Brier 0.045**: Predictions are well-calibrated (low squared error)
- **ECE 0.032**: When model says 90% confidence, it's correct ~90% of the time
- **Accuracy 86.7%**: With threshold 0.95, model correctly classifies 86.7% of batches

**Code References:**
- Prediction recording: `src/lib/modeling.ts` (lines 105-120)
- Metrics calculation: `src/lib/modeling.ts` (lines 29-48)
- Metrics sampling: `src/components/ModelMetricsSampler.tsx`
- Metrics display: `src/components/AIAuditTrail.tsx`

### Use Case 4: Investigating AI-Suggested Deviation

**Scenario:** A quality analyst reviews a deviation that was auto-detected by the quality automation engine.

**Step 1: Navigate to Deviation** (from Quality Management)

```typescript
// Deviation created by automation engine
const deviation: Deviation = {
  id: 'DEV-20251113210000-BTH-042-TEMPERATURE-OOS-123',
  title: 'Temperature OOS detected in BTH-042',
  description: 'Temperature measured 38.5°C vs target 37.0. Value breached specification limits.',
  severity: 'high',
  status: 'open',
  batchId: 'BTH-042',
  reportedBy: 'Digital Twin Monitor',
  reportedDate: new Date('2025-11-13T21:00:00Z'),
  assignedTo: 'Engineering',
  origin: 'digital-twin',  // Indicates AI origin
  metadata: {
    trigger: 'OOS',
    parameter: 'temperature',
    currentValue: 38.5,
    target: 37.0,
    bounds: { min: 36.0, max: 38.0 },
    detectionTime: '2025-11-13T21:00:00Z',
    streak: 3  // Number of consecutive OOS measurements
  }
}
```

**Step 2: Review Context in Operations Assistant**

User asks:
```
"What was happening with batch BTH-042 when the temperature deviation occurred?"
```

Operations Assistant response (grounded in data):
```
Batch BTH-042 (Monoclonal Antibody, Phase: Cell Culture) experienced a temperature 
deviation at 21:00 UTC. Context:

• Temperature spiked from 37.2°C to 38.5°C over 6 minutes (3 consecutive measurements)
• Equipment: Bioreactor BIO-001 (vibration normal, utilization 78%)
• Other parameters stable: Pressure 1.82 bar (spec 1.8 ± 0.3), pH 7.12 (spec 7.1 ± 0.2)
• Batch progress: 67% complete, 33 hours runtime
• Quality prediction before spike: 0.95 (in spec)
• Quality prediction after spike: 0.72 (risk of OOS)

Recommendation: Review bioreactor jacket temperature control and HVAC logs for 
20:54-21:00 UTC window.
```

**Step 3: Create Investigation** (from `src/components/InvestigationWorkflow.tsx`)

```typescript
const investigation: Investigation = {
  id: 'INV-001',
  deviationIds: ['DEV-20251113210000-BTH-042-TEMPERATURE-OOS-123'],
  status: 'analysis',
  priority: 'high',
  lead: 'Quality Assurance',
  stages: [
    {
      id: 'containment',
      title: 'Containment',
      gate: 'containment',
      tasks: [
        { 
          title: 'Isolate affected batch',
          status: 'complete',
          owner: 'Manufacturing'
        },
        { 
          title: 'Review real-time telemetry',
          status: 'complete',
          owner: 'Engineering'
        }
      ]
    },
    {
      id: 'root-cause',
      title: 'Root Cause Analysis',
      gate: 'root-cause',
      tasks: [
        { 
          title: 'Analyze HVAC logs for 20:54-21:00 UTC',
          status: 'in-progress',
          owner: 'Facilities'
        },
        { 
          title: 'Inspect bioreactor temperature probe calibration',
          status: 'pending',
          owner: 'Metrology'
        }
      ]
    }
  ]
}
```

**Step 4: AI-Assisted Root Cause**

User asks Operations Assistant:
```
"Have we seen similar temperature spikes in other batches?"
```

Operations Assistant queries historical data and responds:
```
Yes, 3 similar temperature spikes detected in past 30 days:

1. BTH-038 (2025-10-15): Temperature spike to 38.3°C during cell culture
   - Root cause: HVAC cooling valve stuck
   - Resolution: Valve replaced, batch continued without impact

2. BTH-029 (2025-10-28): Temperature spike to 38.7°C during harvest
   - Root cause: Bioreactor jacket control loop tuning
   - Resolution: PID parameters adjusted

3. BTH-042 (2025-11-13): Current incident

Pattern: All spikes occurred between 20:45-21:15 UTC, suggesting potential 
time-based HVAC control issue or shift change impact.
```

**Code References:**
- Deviation metadata: `src/types/quality.ts` (lines 10-26)
- Investigation workflow: `src/components/InvestigationWorkflow.tsx`
- Operations Assistant context: `src/hooks/use-operations-assistant.ts`

### Use Case 5: Configuring the LLM Gateway for Compliance (cloud or on-prem)

**Scenario:** A pharmaceutical company wants to use the Operations Assistant but requires AI processing to occur behind a controlled gateway for data sovereignty (cloud-hosted or on‑prem).

**Step 1: Deploy an LLM Gateway**

```bash
# Deploy a gateway that fronts your model hosting (Ollama, local LLM, Azure OpenAI, AWS Bedrock, etc.)
# Example: Ollama (local) or a small HTTPS gateway that proxies to your cloud LLM with server-side auth
docker run -d -p 11434:11434 ollama/ollama
ollama pull llama2:13b
```

**Step 2: Configure Platform** (via `.env` file)

```bash
# .env
# Preferred: cloud- or on-prem LLM gateway endpoint
VITE_LLM_GATEWAY_ENDPOINT=https://llm.pharma-company.internal/v1/chat
VITE_LLM_GATEWAY_TOKEN=Bearer your-internal-api-token
VITE_LLM_GATEWAY_MODEL=llama2-13b-gmp  # Company-specific model
# Legacy: VITE_ONPREM_LLM_* envs are still supported
```

**Step 3: Platform Initialization** (from `src/lib/llmGatewayProvider.ts`)

```typescript
// Auto-registration on import if env vars present (see src/main.tsx)
import { registerLLMGateway } from '@/lib/llmGatewayProvider'

if (
  import.meta.env.VITE_LLM_GATEWAY_ENDPOINT &&
  import.meta.env.VITE_LLM_GATEWAY_TOKEN
) {
  registerLLMGateway({
    endpoint: import.meta.env.VITE_LLM_GATEWAY_ENDPOINT,
    token: import.meta.env.VITE_LLM_GATEWAY_TOKEN,
    model: import.meta.env.VITE_LLM_GATEWAY_MODEL || 'gpt-4'
  })
}

// Implementation exported from src/lib/llmGatewayProvider.ts
export function registerLLMGateway(config: LLMGatewayOptions) {
  const w = window as unknown as { spark?: SparkApi }
}

    llmPrompt: (strings, ...expr) => ({ strings, values: expr }),
    llm: async (prompt, model) => {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.token
        },
        body: JSON.stringify({
          model: model || config.model,
          messages: [{ role: 'user', content: formatPrompt(prompt) }]
        })
      })
      
      const data = await response.json()
      return data.choices[0].message.content
    }
  }
}
```

**Step 4: Verification**

When user asks Operations Assistant a question:
```
1. Prompt sent to: https://llm.pharma-company.internal/v1/chat
2. LLM processes via the configured gateway (may be on-premise or cloud)
3. Response logged in audit trail with metadata:
   {
     "action": "AI Assistant Response",
     "module": "ai",
     "metadata": {
       "endpoint": "https://llm.pharma-company.internal",
       "model": "llama2-13b-gmp",
       "responseTime": 1.2s
     }
   }
```

**Benefits:**
- **Data Sovereignty**: All manufacturing data stays within company network
- **Compliance**: No cloud AI services required (GxP/HIPAA compliant)
- **Audit Trail**: Full transparency of AI provider and model used
- **Customization**: Can use company-specific fine-tuned models

**Code References:**
- On-prem provider: `src/lib/onPremSparkProvider.ts` (lines 12-51)
- Configuration: `.env.example`
- Audit logging: `src/hooks/use-audit.ts`

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

**Note**: The platform provides an abstraction layer for equipment data sources. The Digital Twin is used by default for development and demonstration. Production deployments require implementing site-specific adapters for your MES, OPC UA servers, historians, or other data sources. Reference implementations and integration patterns are provided below as examples.

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

**Note**: This is example code for reference. Production implementations require:
- Installing `node-opcua` package: `npm install node-opcua`
- Configuring your specific OPC UA server endpoints and security certificates
- Implementing error handling, reconnection logic, and monitoring
- Adapting data transformations to match your equipment tag structure

```typescript
import { registerEquipmentFeed } from '@/lib/equipmentFeed'
import { OPCUAClient } from 'node-opcua'

// Custom OPC UA adapter (EXAMPLE - requires customization)
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
    // ... (see TECHNICAL_GUIDE.md and docs/equipment-integration.md for complete example)
    
    return () => {
      subscription.terminate()
      client.disconnect()
    }
  }
})
```

### AI/LLM Integration

#### LLM Gateway (cloud or on-prem)

**File:** `src/lib/llmGatewayProvider.ts` (preferred)

**Note**: The Operations Assistant requires an external LLM provider. The platform supports:
- **GitHub Spark Runtime** (when running in GitHub Spark environment)
- **Custom LLM Gateway** (Azure OpenAI, AWS Bedrock, or on-premise LLMs via HTTP endpoint)
- **Development Mock** (deterministic responses for testing without LLM)

Configuration requires setting environment variables (see `.env.example`) and deploying gateway handlers from `examples/` directory. See `examples/README.md` for detailed setup instructions.

```typescript
import { registerLLMGateway } from '@/lib/llmGatewayProvider'

// Configure gateway endpoint (requires deployed gateway with authentication)
registerLLMGateway({
  endpoint: 'https://llm.yourcompany.com/v1/chat',
  token: 'your-api-token',
  model: 'gpt-4' // or your model name
})
```

(Legacy support: `src/lib/onPremSparkProvider.ts` remains available for older deployments.)

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

### AI Credibility and Regulatory Compliance

The platform implements comprehensive controls for AI credibility aligned with FDA's risk-based framework for AI/ML in drug and biological product development.

#### FDA 7-Step Risk-Based Credibility Assessment

The platform follows FDA's guidance on "Considerations for the Use of Artificial Intelligence to Support Regulatory Decision-Making." Full assessment documentation is available in `docs/ai-credibility-assessment.md`.

**Step 1: Decision Context**
- **Intended Use**: Real-time monitoring, risk triage, and decision support (not automated release decisions)
- **Users**: Production operators, quality analysts, supervisors, and administrators
- **Decision Boundaries**: 
  - In-scope: Investigation prioritization, automation suggestions, risk scoring
  - Out-of-scope: Automated batch disposition, GMP-significant changes without approval

**Step 2: Risk Identification**
- **Model Risks**: False negatives (missed alerts), false positives (alert fatigue), miscalibration
- **Data Risks**: Timestamp drift, incomplete records, incorrect tag mapping
- **LLM Risks**: Hallucinations, non-evidence-based suggestions
- **Mitigation**: Human-in-the-loop controls, audit trails, performance monitoring

**Step 3: Credibility Goals**
```typescript
// Performance Targets (from src/lib/modeling.ts and docs/ai-credibility-assessment.md)
const CREDIBILITY_GOALS = {
  AUROC: 0.75,        // Minimum discrimination ability
  BrierScore: 0.20,   // Maximum calibration error
  ECE: 0.10,          // Maximum expected calibration error
  Accuracy: null      // Context-dependent (reported but not enforced)
}

// Decision Thresholds (from src/lib/modeling.ts, lines 54-58)
export const decisionThreshold: Record<ModelId, number> = {
  quality_prediction: 0.95,   // Strict (y=1 means all CPPs in spec)
  deviation_risk: 0.5,        // Balanced
  equipment_failure: 0.5,     // Balanced
}
```

**Step 4: Evidence Generation**
- **Data Sources**: Digital Twin (controlled scenarios), seed data (deterministic tests), pilot data (shadow mode)
- **Methods**: Offline evaluation (AUROC, Brier, ECE), calibration plots, robustness testing, LLM groundedness checks
- **Acceptance Criteria**: Metrics meet goals across ≥100 samples, no category <0.65 AUROC without mitigation

**Step 5: Verification & Validation**
- **Verification**: Unit tests for AUROC/ECE/Brier utilities, integration tests for audit logging
- **Validation**: Shadow-mode pilot comparing predictions to actual events (≥2 weeks), SME review of thresholds and UI language
- **Documentation**: VV logs, prompt inventory, change history

**Step 6: Evidence Presentation**
- **AI Audit Trail**: Full conversation archive, model metrics (AUROC/Brier/ECE), export capability (JSON/CSV)
- **Equipment Details**: Calibration info, supported interfaces
- **Evidence Package**: Available in `docs/evidence/` directory
  - `01-context-of-use.md`: Intended use and decision boundaries
  - `02-data-and-methods.md`: Datasets, sampling strategies
  - `03-results-and-acceptance.md`: Performance metrics, pass/fail criteria
  - `04-prompts-and-controls.md`: LLM prompts, guardrails, fallback behavior
  - `05-security-and-privacy.md`: On-prem gateway, token management, roles
  - `06-change-control.md`: Release notes, approval workflows

**Step 7: Monitoring & Maintenance**
```typescript
// From src/components/ModelMetricsSampler.tsx
// Post-deployment monitoring with automated alerts
const monitoringChecks = {
  // Alert when AUROC drops by >0.1 absolute
  aurocDrift: (current: number, baseline: number) => 
    Math.abs(current - baseline) > 0.1,
  
  // Alert when ECE exceeds threshold
  calibrationDrift: (ece: number) => ece > 0.15,
  
  // Alert when Brier score degrades
  brierDrift: (current: number, baseline: number) => 
    current > baseline + 0.05
}

// All changes require change control
// - Model retraining → Change control record + acceptance rerun
// - Prompt updates → Documented in prompt inventory + audit entry
// - Threshold adjustments → Rationale + audit entry
```

#### AI Transparency Features

**1. Complete Audit Trail** (`src/components/AIAuditTrail.tsx`)
```typescript
// Every AI interaction is logged
{
  timestamp: Date,
  userId: string,
  action: 'AI Assistant Prompt' | 'AI Assistant Response' | 'AI Fallback',
  module: 'ai',
  details: string,  // Full prompt/response (truncated for storage)
  metadata: {
    model?: string,
    endpoint?: string,
    responseTime?: number,
    error?: string
  }
}
```

**2. Model Explainability**
```typescript
// From src/lib/modeling.ts
// Every prediction includes feature attribution
{
  p: 0.85,           // Predicted probability
  y: 1,              // Ground truth outcome
  features: {        // Exact features used in prediction
    cpp_compliance: 0.92,
    temp_delta: 0.3,
    pressure_delta: 0.15,
    ph_delta: 0.05
  }
}
```

**3. Human-in-the-Loop Controls**
- **Quality Automation**: All suggestions require human acceptance via AutomationBridge
- **Operations Assistant**: Clearly labeled as "suggestions" not "decisions"
- **Model Predictions**: Inform risk scores but don't auto-reject batches
- **E-Signatures**: Required for deviation approval, CAPA implementation

**4. Graceful Degradation**
```typescript
// From src/components/OperationsAssistant.tsx (lines 82-86)
if (!spark?.llm || !spark.llmPrompt) {
  const content = buildFallbackResponse()  // Snapshot summary without LLM
  appendMessage({ role: 'assistant', content, createdAt: new Date().toISOString() })
  log('AI Fallback', 'ai', content.slice(0, 1200))  // Explicitly logged
  return
}
```

#### Data Integrity (ALCOA+)

The platform ensures AI-related data meets ALCOA+ principles:

- **Attributable**: All AI events logged with userId and timestamp
- **Legible**: Human-readable JSON format for audit records
- **Contemporaneous**: Real-time logging (no batch delays)
- **Original**: Append-only audit trail with hash chain
- **Accurate**: Model predictions include ground truth for verification
- **Complete**: Full prompt, response, and feature context preserved
- **Consistent**: Standardized event structure across all AI interactions
- **Enduring**: Persistent storage with optional WORM archive
- **Available**: Query API and export functionality (JSON/CSV)

#### AI-Specific Compliance Controls

**1. LLM Prompt Management**
```typescript
// From src/components/OperationsAssistant.tsx (lines 93-110)
// Prompts are versioned and audited
const PROMPT_VERSION = '1.0'
const PROMPT_TEMPLATE = `
  You are the "Operations Copilot" for a GMP manufacturing command center.
  Answer precisely with metrics and concise actions.
  
  OPERATIONS SNAPSHOT (UTC ${timestamp}):
  ${summary}
  
  STRUCTURED DATA (JSON):
  ${structuredData}
`

// Every prompt execution is logged
log('AI Assistant Prompt', 'ai', userQuestion, { 
  promptVersion: PROMPT_VERSION,
  digestTimestamp: digest.updatedAt.toISOString()
})
```

**2. Model Version Control**
```typescript
// From src/lib/modeling.ts
export const MODEL_METADATA = {
  quality_prediction: {
    version: '1.0',
    lastUpdated: '2025-11-01',
    trainingDataset: 'digital-twin-v1',
    validationDataset: 'pilot-shadow-mode-30d',
    threshold: 0.95,
    thresholdRationale: 'Strict threshold since y=1 means all CPPs in spec'
  },
  equipment_failure: {
    version: '1.0',
    lastUpdated: '2025-11-01',
    features: ['vibration_rms', 'run_hours', 'utilization'],
    threshold: 0.5,
    thresholdRationale: 'Balanced threshold for proactive maintenance'
  },
  deviation_risk: {
    version: '1.0',
    lastUpdated: '2025-11-01',
    features: ['temp_norm_dev', 'pressure_norm_dev', 'ph_norm_dev'],
    threshold: 0.5,
    thresholdRationale: 'Balanced for early warning without excessive alerts'
  }
}
```

**3. Change Control for AI Components**

All AI changes require change control records:
- **Model Updates**: Version bump, retraining data summary, acceptance rerun
- **Prompt Changes**: Documented in prompt inventory with approval
- **Threshold Adjustments**: Rationale and audit entry
- **LLM Provider Changes**: Security review and validation

```typescript
// Example change control record
{
  id: 'CC-AI-2025-001',
  title: 'Update quality_prediction decision threshold',
  description: 'Adjust threshold from 0.95 to 0.93 based on 90-day performance data',
  category: 'AI Model Configuration',
  impact: 'Medium - affects batch risk scoring',
  rationale: 'Threshold 0.95 resulted in 12% false negatives. New threshold 0.93 reduces false negatives to 4% with acceptable false positive rate (8%)',
  validation: 'Rerun on historical data shows AUROC=0.89, Brier=0.062, ECE=0.041',
  approvals: [
    { role: 'Data Scientist', name: 'John Smith', date: '2025-11-10' },
    { role: 'Quality Assurance', name: 'Jane Doe', date: '2025-11-11' }
  ],
  implementation: '2025-11-13',
  auditTrailRef: 'AUD-2025-1345'
}
```

#### Pilot Readiness Checklist

Before deploying AI features to production:

- ✓ LLM gateway configured (cloud or on-premise)
- ✓ AI audit logging validated (prompts, responses, errors logged)
- ✓ Model metrics sampling active (AUROC/Brier/ECE visible)
- ✓ Equipment feed uses production adapter (not Digital Twin)
- ✓ UI language reviewed (non-binding suggestions, no automated decisions)
- ✓ Access controls defined (least privilege for data sources)
- ✓ Change control workflow available (prompts, models, thresholds)
- ✓ Evidence package prepared (all 6 documents in `docs/evidence/`)
- ✓ Performance baselines established (shadow mode ≥2 weeks)
- ✓ SME review completed (thresholds, prompts, UI language)

**Reference:** Full assessment in `docs/ai-credibility-assessment.md`

## Configuration

### Environment Variables

Create a `.env` file for custom configuration:

```bash
# LLM Gateway (cloud or on-premise) (optional)
VITE_LLM_GATEWAY_ENDPOINT=https://your-llm-gateway.com/v1/chat
# Legacy: VITE_ONPREM_LLM_ENDPOINT is still supported
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

```mermaid
graph TB
    subgraph AWS["AWS Cloud"]
        ALB["Application Load Balancer (ALB)"]
        
        subgraph ECS["Amazon ECS / EKS (Container Orchestration)"]
            Frontend["Frontend Container<br/>(React+Vite)"]
            Backend["Backend Container<br/>(Express.js)"]
        end
        
        subgraph Storage["Storage Services"]
            RDS["Amazon RDS/<br/>DynamoDB<br/>(Optional)"]
            S3["Amazon S3<br/>(Audit Archive)"]
            KMS["Amazon KMS<br/>(Encryption Keys)"]
        end
        
        ALB --> ECS
        ECS --> Storage
    end
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
VITE_LLM_GATEWAY_ENDPOINT=https://your-llm.amazonaws.com/v1/chat
# Legacy: VITE_ONPREM_LLM_ENDPOINT is still supported
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

```mermaid
graph TB
    subgraph Azure["Azure Cloud"]
        Gateway["Azure Application Gateway /<br/>Front Door"]
        
        subgraph Containers["Azure Kubernetes Service (AKS) / Container Instances"]
            Frontend["Frontend Container<br/>(React+Vite)"]
            Backend["Backend Container<br/>(Express.js)"]
        end
        
        subgraph Storage["Storage Services"]
            SQL["Azure SQL/<br/>Cosmos DB<br/>(Optional)"]
            Blob["Blob Storage<br/>(Audit Archive)"]
            KeyVault["Key Vault<br/>(Secrets)"]
        end
        
        Gateway --> Containers
        Containers --> Storage
    end
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
VITE_LLM_GATEWAY_ENDPOINT=https://your-llm.azurewebsites.net/v1/chat
# Legacy: VITE_ONPREM_LLM_ENDPOINT is still supported
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
