# BioPharm GMP Intelligence Platform

An AI-powered platform for real-time manufacturing oversight, quality management, and predictive analytics in biotechnology and pharmaceutical GMP (Good Manufacturing Practice) environments.

## Overview

This platform provides comprehensive manufacturing intelligence and quality assurance capabilities for biotech/pharma operations, featuring:

- **Real-time Manufacturing Oversight**: Live monitoring of batch execution, equipment status, and critical process parameters
- **AI-Powered Quality Management**: Intelligent workflows for deviations, investigations, CAPAs (Corrective and Preventive Actions), and change controls
- **Predictive Analytics**: ML-based analysis of historical and real-time MES data to predict quality issues and equipment failures
- **Regulatory Compliance**: Complete audit trails, e-signatures, and evidence packages aligned with ICH, ISO, and GMP standards
- **Digital Twin Simulation**: Equipment behavior simulation for testing and training scenarios

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Vite** - Build tool and dev server
- **GitHub Spark** - AI-powered development framework
- **Tailwind CSS** - Styling with custom pharmaceutical-focused design system
- **Radix UI** - Accessible component primitives
- **Recharts & D3** - Data visualization
- **React Query** - Server state management

### Backend
- **Express.js** - REST API server
- **Node.js** - Runtime environment
- **JSONL-based storage** - Append-only audit logs with SHA-256 hash chain
- **Optional RBAC** - Role-based access control for compliance

### Key Libraries
- **@github/spark** - AI capabilities and state management
- **framer-motion** - Animations
- **zod** - Schema validation
- **jszip** - Archive generation
- **date-fns** - Date manipulation

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
│   │   └── ui/                    # Reusable UI components
│   ├── lib/               # Core libraries
│   │   ├── digitalTwin.ts         # Equipment simulation
│   │   ├── qualityAutomation.ts   # Quality workflow engine
│   │   ├── modeling.ts            # Predictive models
│   │   ├── onPremSparkProvider.ts # On-prem LLM gateway
│   │   └── devSparkMock.ts        # Development mock
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── data/              # Seed data and mock data
│   └── App.tsx            # Main application component
├── server/                # Backend API
│   ├── index.mjs          # Express server
│   └── stores/            # Data stores (audit, metrics, archive)
├── docs/                  # Documentation
│   ├── platform-abstraction-layer.md
│   ├── local-api.md
│   ├── equipment-integration.md
│   ├── ai-credibility-assessment.md
│   └── evidence/          # FDA validation templates
├── public/                # Static assets
└── dist/                  # Build output (generated)
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
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

## Key Features

### 1. **Real-Time Dashboard**
- Live equipment status monitoring
- Batch execution tracking
- Critical alerts and notifications
- KPI visualization

### 2. **Quality Management System (eQMS)**
- **Deviations**: Create, investigate, and resolve manufacturing deviations
- **Investigations**: AI-assisted root cause analysis workflows
- **CAPAs**: Corrective and preventive action management
- **Change Controls**: Structured change management process
- **E-Signatures**: Electronic signature capture with audit trail

### 3. **Batch Monitoring**
- Real-time batch status and progress
- Critical process parameter (CPP) tracking
- Batch analytics and trending
- Historical batch comparison

### 4. **Predictive Analytics**
- Equipment failure prediction
- Quality risk scoring
- Trend analysis and pattern recognition
- Model performance metrics

### 5. **Audit & Compliance**
- Tamper-evident audit trail with hash chain verification
- AI interaction logging
- Evidence package export (FDA-ready)
- Archive validation

### 6. **Operations Assistant**
- AI-powered copilot for manufacturing operations
- Natural language queries
- Contextual recommendations
- Integrated with quality workflows

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
```

See [docs/platform-abstraction-layer.md](docs/platform-abstraction-layer.md) for deployment options.

## Digital Twin Controls

The platform includes a floating digital twin controller for simulating equipment behavior:

- **Play/Pause**: Control simulation execution
- **Speed**: Adjust simulation speed (5-600 seconds per tick)
- **Draggable**: Reposition the control panel

The digital twin generates realistic manufacturing events for testing and training.

## Documentation

### Technical Documentation

- **[Technical Guide](docs/TECHNICAL_GUIDE.md)** - Comprehensive technical documentation with architecture, code examples, use cases, and deployment guide
- **[Platform Abstraction Layer](docs/platform-abstraction-layer.md)** - Architecture and deployment flexibility
- **[Local API Server](docs/local-api.md)** - Backend API documentation
- **[Equipment Integration](docs/equipment-integration.md)** - Equipment connectivity guide
- **[AI Credibility Assessment](docs/ai-credibility-assessment.md)** - FDA 7-step risk assessment
- **[Evidence Package](docs/evidence/)** - FDA validation templates

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

## Compliance & Security

### Audit Trail
- Append-only JSONL with SHA-256 hash chain
- Tamper detection via cryptographic verification
- Immutable archive support (WORM-like semantics)

### E-Signatures
- Web Crypto API for digital signatures
- Timestamped with ISO 8601
- User ID and reason captured

### RBAC (Optional)
Supported roles:
- Admin
- Quality Approver
- Supervisor
- System

Enable via `RBAC_ENABLED=true` environment variable.

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
