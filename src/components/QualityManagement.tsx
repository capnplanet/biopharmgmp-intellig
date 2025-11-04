import React, { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ESignaturePrompt, type SignatureResult } from '@/components/ESignaturePrompt'
import { batches } from '@/data/seed'
import { useProductionBatches } from '@/hooks/use-production-batches'
import { BATCH_IDS, CAPA_IDS, CHANGE_CONTROL_IDS, DEVIATION_IDS, MATERIAL_LOTS } from '@/data/identifiers'
import {
  Warning,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  Plus,
  FileText,
  Robot,
  ListChecks,
  PlayCircle,
  SealCheck,
  CopySimple,
  LinkSimple
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { notifyQualityEventResolved } from '@/lib/qualityAutomation'
import { daysAgo, daysAhead } from '@/lib/timeframe'
import { useAlerts } from '@/hooks/use-alerts'
import type { AlertSeverity } from '@/types/alerts'
import type { AutomationSuggestion } from '@/types/automation'
import type { CAPA, ChangeControl, Deviation, ESignatureRecord, Investigation } from '@/types/quality'
import { calculateInvestigationProgress, createInvestigationFromDeviation, normalizeInvestigation } from '@/utils/investigation'
import { useAuditLogger } from '@/hooks/use-audit'
import { useQualityNavigation } from '@/hooks/use-quality-navigation'
import QualityAssistantPanel, { AssistantMode } from '@/components/QualityAssistantPanel'

type QualityTab = 'deviations' | 'investigations' | 'capa' | 'change-control'

export const mockDeviations: Deviation[] = [
  {
    id: DEVIATION_IDS.temperatureExcursion,
    title: 'Temperature Excursion in Bioreactor',
    description: 'Temperature exceeded upper control limit of 37.5°C, reaching 38.2°C for 15 minutes during fermentation phase.',
    severity: 'high',
    status: 'investigating',
    batchId: BATCH_IDS.warning,
    reportedBy: 'Sarah Chen',
    reportedDate: daysAgo(0, 9.5),
    assignedTo: 'Quality Team A',
    signatures: [
      {
        id: `${DEVIATION_IDS.temperatureExcursion}-sign-1`,
        action: 'Initial Assessment Approval',
        signedBy: 'qa.signer@biopharm.com',
        signedAt: daysAgo(0, 9.75),
        reason: 'Containment plan verified',
        digitalSignature: 'SHA256:1111111111111111111111111111111111111111111111111111111111111111'
      }
    ]
  },
  {
    id: DEVIATION_IDS.documentationDiscrepancy,
    title: 'Documentation Discrepancy',
    description: 'Batch record shows conflicting pH values between manual recording and automated system.',
    severity: 'medium',
    status: 'open',
    batchId: BATCH_IDS.smallMolecule,
    reportedBy: 'Mike Rodriguez',
    reportedDate: daysAgo(0, 14.25)
  },
  {
    id: DEVIATION_IDS.materialOutOfSpec,
    title: 'Raw Material Out of Spec',
    description: `Incoming raw material lot ${MATERIAL_LOTS.moistureSensitive} failed moisture content specification (5.2% vs 5.0% max).`,
    severity: 'critical',
    status: 'resolved',
    batchId: BATCH_IDS.monoclonal,
    reportedBy: 'Quality Control',
    reportedDate: daysAgo(1, 11.33),
    assignedTo: 'Quality Team B',
    rootCause: 'Supplier storage conditions not maintained during transport',
    correctiveActions: [
      'Reject affected lot and source replacement material',
      'Contact supplier to review transport procedures',
      'Implement additional incoming inspection for this material'
    ],
    effectivenessCheck: {
      dueDate: daysAhead(40),
      status: 'pending'
    }
  }
]

export const mockCAPAs: CAPA[] = [
  {
    id: CAPA_IDS.temperatureControlUpgrade,
    title: 'Bioreactor Temperature Control System Upgrade',
    description: 'Implement enhanced temperature control system to prevent future excursions',
    type: 'preventive',
    priority: 'high',
    status: 'approved',
    dueDate: daysAhead(60),
    assignedTo: 'Engineering Team',
    relatedDeviations: [DEVIATION_IDS.temperatureExcursion],
    actions: [
      {
        id: 'ACT-001',
        description: 'Procure upgraded temperature control hardware',
        responsible: 'Procurement',
        dueDate: daysAhead(30),
        status: 'pending'
      },
      {
        id: 'ACT-002',
        description: 'Install and validate new control system',
        responsible: 'Engineering',
        dueDate: daysAhead(45),
        status: 'pending'
      }
    ],
    effectivenessCheck: {
      dueDate: daysAhead(75),
      status: 'pending'
    }
  },
  {
    id: CAPA_IDS.chromatographyCalibration,
    title: 'Chromatography Skid Calibration (CRY-001) Program',
    description: 'Address overdue calibration on CRY-001 and due-soon filters (FIL-001) with risk assessment and schedule tightening.',
    type: 'preventive',
    priority: 'medium',
    status: 'draft',
    dueDate: daysAhead(135),
    assignedTo: 'Metrology Team',
    relatedDeviations: [],
    actions: [
      { id: 'ACT-003', description: 'Perform calibration on CRY-001', responsible: 'Metrology', dueDate: daysAhead(110), status: 'pending' },
      { id: 'ACT-004', description: 'Schedule filter train FIL-001 calibration and verification', responsible: 'Maintenance', dueDate: daysAhead(120), status: 'pending' }
    ],
    effectivenessCheck: {
      dueDate: daysAhead(150),
      status: 'pending'
    }
  },
  {
    id: CAPA_IDS.vibrationMonitoring,
    title: 'Vibration Monitoring Enhancement (BIO-002, FIL-002)',
    description: 'Implement continuous vibration monitoring and alert thresholds for BIO-002 and FIL-002 to prevent equipment-related deviations.',
    type: 'preventive',
    priority: 'high',
    status: 'approved',
    dueDate: daysAhead(165),
    assignedTo: 'Engineering Team',
    relatedDeviations: [DEVIATION_IDS.temperatureExcursion],
    actions: [
      { id: 'ACT-005', description: 'Install accelerometers on BIO-002 & FIL-002', responsible: 'Engineering', dueDate: daysAhead(140), status: 'pending' },
      { id: 'ACT-006', description: 'Define and validate vibration RMS alert thresholds', responsible: 'Quality & Engineering', dueDate: daysAhead(150), status: 'pending' }
    ],
    effectivenessCheck: {
      dueDate: daysAhead(195),
      status: 'pending'
    }
  }
]

const deviationSignatureDemo = {
  username: 'qa.signer@biopharm.com',
  password: 'DemoPass123!'
}

export const mockInvestigations: Investigation[] = [
  {
    id: DEVIATION_IDS.temperatureExcursion,
    deviationId: DEVIATION_IDS.temperatureExcursion,
    title: 'Investigation - Temperature Excursion in Bioreactor',
    severity: 'high',
    lead: 'Quality Team A',
    status: 'analysis',
    riskLevel: 'high',
    startedOn: daysAgo(0, 10),
    targetCompletion: daysAhead(3),
    relatedCapas: [CAPA_IDS.temperatureControlUpgrade],
    timeline: [
      {
        id: `${DEVIATION_IDS.temperatureExcursion}-timeline-1`,
        timestamp: daysAgo(0, 9.67),
        summary: 'Deviation triaged and investigation initiated',
        actor: 'Sarah Chen'
      },
      {
        id: `${DEVIATION_IDS.temperatureExcursion}-timeline-2`,
        timestamp: daysAgo(0, 10.08),
        summary: 'Containment actions implemented',
        actor: 'Manufacturing'
      },
      {
        id: `${DEVIATION_IDS.temperatureExcursion}-timeline-3`,
        timestamp: daysAgo(0, 12.25),
        summary: 'Preliminary root-cause hypothesis drafted',
        actor: 'Quality Team A'
      }
    ],
    stages: [
      {
        id: 'containment',
        title: 'Immediate Containment',
        description: 'Stabilize process conditions and segregate impacted product.',
        gate: 'containment',
        tasks: [
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-containment-1`,
            title: `Quarantine impacted batch ${BATCH_IDS.warning}`,
            description: 'Tag and segregate work-in-progress to prevent unintended release.',
            owner: 'Manufacturing',
            dueDate: daysAgo(0, 10.5),
            status: 'complete',
            completedOn: daysAgo(0, 10.33),
            notes: 'Batch status updated to QUARANTINE in MES.'
          },
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-containment-2`,
            title: 'Stabilize reactor BIO-002 temperature loop',
            description: 'Return fermentation temperature to 37°C and monitor for oscillations.',
            owner: 'Engineering',
            dueDate: daysAgo(0, 10.75),
            status: 'complete',
            completedOn: daysAgo(0, 10.53),
            notes: 'Manual override applied; PID retune pending.'
          }
        ]
      },
      {
        id: 'root-cause',
        title: 'Root Cause Analysis',
        description: 'Collect data and confirm technical hypothesis.',
        gate: 'root-cause',
        tasks: [
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-root-cause-1`,
            title: 'Extract historian and MES data for BIO-002',
            description: 'Pull temperature, agitation, and valve position trends covering the excursion.',
            owner: 'Data Analytics',
            dueDate: daysAgo(0, 13),
            status: 'in-progress',
            notes: 'Trend review identified oscillatory control output.'
          },
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-root-cause-2`,
            title: 'Facilitate 5-Why workshop',
            description: 'Cross-functional session to document most probable root cause and contributing factors.',
            owner: 'Quality Team A',
            dueDate: daysAhead(1, 9),
            status: 'pending'
          }
        ]
      },
      {
        id: 'corrective',
        title: 'Corrective & Preventive Planning',
        description: 'Define CAPA scope and product disposition.',
        gate: 'corrective',
        tasks: [
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-corrective-1`,
            title: 'Draft CAPA for PID retune and hardware upgrade',
            description: 'Summarize engineering changes and training updates needed to prevent recurrence.',
            owner: 'Engineering',
            dueDate: daysAhead(1, 12),
            status: 'pending'
          },
          {
            id: `${DEVIATION_IDS.temperatureExcursion}-corrective-2`,
            title: 'Document batch disposition decision',
            description: 'Complete risk assessment and QA release recommendation.',
            owner: 'Quality Assurance',
            dueDate: daysAhead(2, 17),
            status: 'pending'
          }
        ]
      }
    ],
    effectivenessReview: {
      dueDate: daysAhead(40),
      status: 'scheduled',
      notes: '30-day process performance review after CAPA implementation.'
    }
  },
  {
    id: DEVIATION_IDS.documentationDiscrepancy,
    deviationId: DEVIATION_IDS.documentationDiscrepancy,
    title: 'Investigation - Documentation Discrepancy',
    severity: 'medium',
    lead: 'Document Control',
    status: 'triage',
    riskLevel: 'medium',
    startedOn: daysAgo(0, 15),
    targetCompletion: daysAhead(2),
    timeline: [
      {
        id: `${DEVIATION_IDS.documentationDiscrepancy}-timeline-1`,
        timestamp: daysAgo(0, 14.33),
        summary: 'Deviation submitted by manufacturing',
        actor: 'Mike Rodriguez'
      },
      {
        id: `${DEVIATION_IDS.documentationDiscrepancy}-timeline-2`,
        timestamp: daysAgo(0, 15.17),
        summary: 'Investigation lead assigned',
        actor: 'Quality Systems'
      }
    ],
    stages: [
      {
        id: 'containment',
        title: 'Record Containment',
        description: 'Protect data integrity and gather contemporaneous records.',
        gate: 'containment',
        tasks: [
          {
            id: `${DEVIATION_IDS.documentationDiscrepancy}-containment-1`,
            title: 'Lock batch record for review',
            description: 'Restrict editing access to the affected record while investigation is active.',
            owner: 'Document Control',
            dueDate: daysAgo(0, 15.5),
            status: 'in-progress'
          },
          {
            id: `${DEVIATION_IDS.documentationDiscrepancy}-containment-2`,
            title: 'Collect automated sensor logs',
            description: 'Download pH sensor outputs from SCADA to compare with manual entries.',
            owner: 'Automation',
            dueDate: daysAgo(0, 18),
            status: 'pending'
          }
        ]
      },
      {
        id: 'root-cause',
        title: 'Root Cause Confirmation',
        description: 'Compare manual vs automated entries to locate transcription error.',
        gate: 'root-cause',
        tasks: [
          {
            id: `${DEVIATION_IDS.documentationDiscrepancy}-root-cause-1`,
            title: 'Interview shift operator',
            description: 'Review manual entry process, training records, and any distractions during recording.',
            owner: 'Manufacturing Supervisor',
            dueDate: daysAhead(1, 10),
            status: 'pending'
          }
        ]
      }
    ]
  },
  {
    id: DEVIATION_IDS.materialOutOfSpec,
    deviationId: DEVIATION_IDS.materialOutOfSpec,
    title: 'Investigation - Raw Material Out of Specification',
    severity: 'critical',
    lead: 'Quality Control',
    status: 'closed',
    riskLevel: 'high',
    startedOn: daysAgo(1, 11.5),
    targetCompletion: daysAgo(0, 2),
    relatedCapas: [CAPA_IDS.chromatographyCalibration],
    timeline: [
      {
        id: `${DEVIATION_IDS.materialOutOfSpec}-timeline-1`,
        timestamp: daysAgo(1, 11.33),
        summary: `Incoming material ${MATERIAL_LOTS.moistureSensitive} moisture failure documented`,
        actor: 'Quality Control'
      },
      {
        id: `${DEVIATION_IDS.materialOutOfSpec}-timeline-2`,
        timestamp: daysAgo(1, 12.17),
        summary: 'Supplier notified and replacement lot requested',
        actor: 'Procurement'
      },
      {
        id: `${DEVIATION_IDS.materialOutOfSpec}-timeline-3`,
        timestamp: daysAgo(0, 9),
        summary: 'Effectiveness check scheduled and additional inspection points added',
        actor: 'Quality Assurance'
      }
    ],
    stages: [
      {
        id: 'containment',
        title: 'Material Containment',
        description: 'Ensure suspect raw material is segregated and dispositioned.',
        gate: 'containment',
        tasks: [
          {
            id: `${DEVIATION_IDS.materialOutOfSpec}-containment-1`,
            title: 'Quarantine raw material lot',
            description: `Isolate lot ${MATERIAL_LOTS.moistureSensitive} and tag for supplier investigation.`,
            owner: 'Warehouse',
            dueDate: daysAgo(1, 13),
            status: 'complete',
            completedOn: daysAgo(1, 12.75)
          },
          {
            id: `${DEVIATION_IDS.materialOutOfSpec}-containment-2`,
            title: 'Notify supplier quality team',
            description: 'Request formal investigation and transportation temperature logs.',
            owner: 'Quality Control',
            dueDate: daysAgo(1, 15),
            status: 'complete',
            completedOn: daysAgo(1, 14.5)
          }
        ]
      },
      {
        id: 'root-cause',
        title: 'Supplier Engagement',
        description: 'Work with supplier to confirm root cause and corrective action.',
        gate: 'root-cause',
        tasks: [
          {
            id: `${DEVIATION_IDS.materialOutOfSpec}-root-cause-1`,
            title: 'Review supplier CA/PA plan',
            description: 'Assess adequacy of supplier corrective action commitments.',
            owner: 'Supplier Quality',
            dueDate: daysAhead(5),
            status: 'pending'
          }
        ]
      }
    ],
    effectivenessReview: {
      dueDate: daysAhead(45),
      status: 'scheduled',
      notes: 'Monitor incoming moisture trend for replacement lots.'
    }
  }
]

export function QualityManagement() {
  const [deviations, setDeviations] = useKV<Deviation[]>('deviations', mockDeviations)
  const [capas, setCAPAs] = useKV<CAPA[]>('capas', mockCAPAs)
  const [investigations, setInvestigations] = useKV<Investigation[]>('investigations', mockInvestigations)
  const [automationQueue = [], setAutomationQueue] = useKV<AutomationSuggestion[]>('automation-queue', [])
  const [changeControls = []] = useKV<ChangeControl[]>('change-controls', [
    {
      id: CHANGE_CONTROL_IDS.pidRetune,
      title: 'Implement new bioreactor temperature PID parameters',
      description: 'Retune control loop following excursion analysis to improve stability around 37°C',
      status: 'in-review',
      requestedBy: 'Engineering',
      requestedDate: daysAgo(0, 8),
      impactedBatches: [BATCH_IDS.warning],
      impactedEquipment: ['BIO-002'],
      riskLevel: 'medium'
    },
    {
      id: CHANGE_CONTROL_IDS.vibrationMonitoring,
      title: 'Add vibration monitoring to FIL-001 & CRY-001',
      description: 'Permanent installation of sensors and alarm thresholds',
      status: 'approved',
      requestedBy: 'Quality',
      requestedDate: daysAgo(0, 6),
      impactedBatches: [BATCH_IDS.smallMolecule, BATCH_IDS.warning],
      impactedEquipment: ['FIL-001','CRY-001'],
      riskLevel: 'high'
    }
  ])
  const productionBatches = useProductionBatches()
  const batchSource = productionBatches.length ? productionBatches : batches
  const batchLookup = useMemo(() => {
    const source = productionBatches.length ? productionBatches : batches
    const map = new Map<string, (typeof source)[number]>()
    source.forEach(batch => map.set(batch.id, batch))
    return map
  }, [productionBatches])
  const { log } = useAuditLogger()
  const { recordAlert } = useAlerts()
  const [investigationNotes, setInvestigationNotes] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('deviation')
  const [assistantRecordId, setAssistantRecordId] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'deviations' | 'investigations' | 'capa' | 'change-control'>('deviations')
  const navigateQuality = useQualityNavigation()
  const pendingAutomation = (automationQueue || []).filter(item => item.status === 'pending')
  const automationHistory = (automationQueue || []).filter(item => item.status !== 'pending')
  const assistantModeLabels: Record<AssistantMode, string> = {
    deviation: 'Deviation Investigation Support',
    capa: 'CAPA Authoring Support',
    'change-control': 'Change Control Planning'
  }
  const deviationStatusAlertSeverity: Partial<Record<Deviation['status'], AlertSeverity>> = {
    open: 'warning',
    investigating: 'warning',
    resolved: 'success',
    closed: 'success',
  }

  const formatDate = (d: Date | string | undefined) => {
    if (!d) return ''
    const dt = d instanceof Date ? d : new Date(d)
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()
  }

  const formatDateTime = (value: Date | string | undefined) => {
    if (!value) return ''
    const dt = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt)
  }

  // Hydrate date fields if they were persisted as strings
  React.useEffect(() => {
    const normalizeDeviation = (d: Deviation): Deviation => ({
      ...d,
      reportedDate: new Date(d.reportedDate as unknown as string),
      effectivenessCheck: d.effectivenessCheck
        ? {
            ...d.effectivenessCheck,
            dueDate: new Date(d.effectivenessCheck.dueDate as unknown as string),
          }
        : undefined,
      signatures: d.signatures
        ? d.signatures.map(sig => ({
            ...sig,
            signedAt: new Date(sig.signedAt as unknown as string)
          }))
        : undefined,
    })

    const normalizeCAPA = (c: CAPA): CAPA => ({
      ...c,
      dueDate: new Date(c.dueDate as unknown as string),
      actions: c.actions.map(a => ({
        ...a,
        dueDate: new Date(a.dueDate as unknown as string),
      })),
      effectivenessCheck: c.effectivenessCheck ? {
        ...c.effectivenessCheck,
        dueDate: new Date(c.effectivenessCheck.dueDate as unknown as string)
      } : undefined,
      signatures: c.signatures
        ? c.signatures.map(sig => ({
            ...sig,
            signedAt: new Date(sig.signedAt as unknown as string)
          }))
        : undefined
    })

    if (deviations && deviations.length > 0 && typeof deviations[0].reportedDate !== 'object') {
      setDeviations((deviations || []).map(normalizeDeviation))
    }
    if (capas && capas.length > 0 && typeof capas[0].dueDate !== 'object') {
      setCAPAs((capas || []).map(normalizeCAPA))
    }
    if (investigations && investigations.length > 0 && typeof investigations[0].startedOn !== 'object') {
      setInvestigations((investigations || []).map(normalizeInvestigation))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      implementing: 'bg-yellow-100 text-yellow-800',
      complete: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const parameterLabels: Record<AutomationSuggestion['parameter'], string> = {
    temperature: 'Temperature',
    pressure: 'Pressure',
    pH: 'pH',
    volume: 'Volume'
  }

  const parameterUnits: Record<AutomationSuggestion['parameter'], string> = {
    temperature: '°C',
    pressure: 'bar',
    pH: 'pH',
    volume: 'L'
  }

  const createDeviationSignature = (deviation: Deviation, action: string, signature: SignatureResult): ESignatureRecord => ({
    id: `${deviation.id}-${signature.timestamp.getTime()}`,
    action,
    signedBy: signature.userId,
    signedAt: signature.timestamp,
    reason: signature.reason,
    digitalSignature: signature.digitalSignature
  })

  const copySignatureHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Signature hash copied to clipboard')
    } catch (error) {
      console.error(error)
      toast.error('Unable to copy signature hash')
    }
  }

  const ensureInvestigationForDeviation = (deviation: Deviation) => {
    setInvestigations(current => {
      const list = current || []
      if (list.some(inv => inv.deviationId === deviation.id)) {
        return list
      }
  const newInvestigation = createInvestigationFromDeviation(deviation)
  log('Investigation Created', 'workflow', `Workflow initialized for ${deviation.id}`, { recordId: deviation.id })
      return [newInvestigation, ...list]
    })
  }

  const markAutomationSuggestion = (suggestionId: string, updates: Partial<AutomationSuggestion>) => {
    setAutomationQueue(current => {
      const list = current || []
      return list.map(item => (item.id === suggestionId ? { ...item, ...updates } : item))
    })
  }

  const handleAutomationApproval = async (suggestion: AutomationSuggestion, signature: SignatureResult) => {
    const deviation = (deviations || []).find(dev => dev.id === suggestion.deviationId)
    if (!deviation) {
      toast.error('Associated deviation not found for automation recommendation')
      recordAlert('Automation approval failed', `Suggestion ${suggestion.id} is missing deviation ${suggestion.deviationId}.`, {
        severity: 'error',
        source: 'quality',
        relatedRecordId: suggestion.deviationId,
        context: {
          suggestionId: suggestion.id,
          action: 'approve',
        },
      })
      return
    }

    ensureInvestigationForDeviation(deviation)

    const signatureRecordId = `${deviation.id}-${signature.timestamp.getTime()}`
    updateDeviationStatus(deviation, 'investigating', {
      signature,
      action: 'Automation Plan Approved',
      mutateDeviation: (current) => ({
        ...current,
        assignedTo: suggestion.assignee,
        metadata: {
          ...(current.metadata || {}),
          automationSuggestionId: suggestion.id,
          automationDecision: 'accepted',
          automationDecisionAt: signature.timestamp.toISOString(),
          automationDecisionBy: signature.userId,
          automationSummary: suggestion.summary,
          automationMeasurement: suggestion.measurement,
        },
      }),
    })

    setInvestigations(current => {
      const list = current || []
      const timestamp = signature.timestamp
      return list.map(inv => {
        if (inv.deviationId !== suggestion.deviationId) return inv
        const timelineEntry = {
          id: `${inv.id}-automation-${timestamp.getTime()}`,
          timestamp,
          summary: 'Automation plan approved and investigation escalated',
          actor: signature.userId,
          details: suggestion.summary,
        }
        return {
          ...inv,
          lead: suggestion.assignee,
          timeline: [timelineEntry, ...inv.timeline],
        }
      })
    })

    markAutomationSuggestion(suggestion.id, {
      status: 'accepted',
      decision: 'accepted',
      decisionBy: signature.userId,
      decisionReason: signature.reason,
      resolvedAt: signature.timestamp.toISOString(),
      decisionSignatureId: signatureRecordId,
    })

    log('AI Recommendation Accepted', 'ai', `Automation suggestion ${suggestion.id} approved for deviation ${deviation.id}.`, {
      recordId: deviation.id,
      digitalSignature: signature.digitalSignature,
      userOverride: {
        id: signature.userId,
        role: 'Quality Approver',
        ipAddress: '127.0.0.1',
        sessionId: `sess-esign-${deviation.id.slice(-4)}`,
      },
    })

    toast.success(`Automation plan ${suggestion.id} approved and investigation launched`)
    recordAlert(`Automation plan ${suggestion.id} approved`, `Investigation launched for deviation ${deviation.id} by ${signature.userId}.`, {
      severity: 'success',
      source: 'quality',
      relatedRecordId: deviation.id,
      context: {
        suggestionId: suggestion.id,
        decisionReason: signature.reason,
        signatureId: signatureRecordId,
      },
    })
  }

  const handleAutomationDismissal = async (suggestion: AutomationSuggestion, signature: SignatureResult) => {
    const deviation = (deviations || []).find(dev => dev.id === suggestion.deviationId)
    if (!deviation) {
      toast.error('Associated deviation not found for automation recommendation')
      recordAlert('Automation dismissal failed', `Suggestion ${suggestion.id} is missing deviation ${suggestion.deviationId}.`, {
        severity: 'error',
        source: 'quality',
        relatedRecordId: suggestion.deviationId,
        context: {
          suggestionId: suggestion.id,
          action: 'dismiss',
        },
      })
      return
    }

    setDeviations(current => {
      const list = current || []
      return list.map(dev => {
        if (dev.id !== suggestion.deviationId) return dev
        const record = createDeviationSignature(dev, 'Automation Plan Dismissed', signature)
        return {
          ...dev,
          signatures: [...(dev.signatures || []), record],
          metadata: {
            ...(dev.metadata || {}),
            automationSuggestionId: suggestion.id,
            automationDecision: 'dismissed',
            automationDecisionAt: signature.timestamp.toISOString(),
            automationDecisionBy: signature.userId,
            automationDecisionReason: signature.reason,
          },
        }
      })
    })

    markAutomationSuggestion(suggestion.id, {
      status: 'dismissed',
      decision: 'dismissed',
      decisionBy: signature.userId,
      decisionReason: signature.reason,
      resolvedAt: signature.timestamp.toISOString(),
      decisionSignatureId: `${suggestion.deviationId}-${signature.timestamp.getTime()}`,
    })

    log('AI Recommendation Dismissed', 'ai', `Automation suggestion ${suggestion.id} dismissed for deviation ${suggestion.deviationId}. Reason: ${signature.reason}`, {
      recordId: suggestion.deviationId,
      digitalSignature: signature.digitalSignature,
      userOverride: {
        id: signature.userId,
        role: 'Quality Approver',
        ipAddress: '127.0.0.1',
        sessionId: `sess-esign-${suggestion.deviationId.slice(-4)}`,
      },
    })

    toast.warning(`Automation plan ${suggestion.id} dismissed`)
    recordAlert(`Automation plan ${suggestion.id} dismissed`, `Dismissed for deviation ${suggestion.deviationId} by ${signature.userId}.`, {
      severity: 'warning',
      source: 'quality',
      relatedRecordId: suggestion.deviationId,
      context: {
        suggestionId: suggestion.id,
        decisionReason: signature.reason,
      },
    })
  }

  const formatInvestigationStatus = (status: Investigation['status']) => {
    const labels: Record<Investigation['status'], string> = {
      triage: 'Triage',
      analysis: 'Analysis',
      'root-cause': 'Root Cause',
      'corrective-actions': 'Corrective Actions',
      effectiveness: 'Effectiveness',
      closed: 'Closed'
    }
    return labels[status] ?? status
  }

  const getRiskBadgeColor = (risk: Investigation['riskLevel']) => {
    const colors = {
      low: 'bg-emerald-100 text-emerald-800',
      medium: 'bg-amber-100 text-amber-800',
      high: 'bg-rose-100 text-rose-800'
    }
    return colors[risk]
  }

  const openAssistant = (mode: AssistantMode, recordId: string) => {
    setAssistantMode(mode)
    setAssistantRecordId(recordId)
    setAssistantOpen(true)
    log('AI Assistant Opened', 'ai', `${assistantModeLabels[mode]} launched for ${recordId}`, {
      recordId
    })
  }

  const handleAssistantVisibility = (next: boolean) => {
    setAssistantOpen(next)
    if (!next) {
      log('AI Assistant Closed', 'ai', assistantRecordId ? `Assistant closed after working on ${assistantRecordId}` : 'Assistant closed', {
        recordId: assistantRecordId
      })
    }
  }

  const updateDeviationStatus = (
    deviation: Deviation,
    newStatus: Deviation['status'],
    options?: { signature?: SignatureResult; action?: string; mutateDeviation?: (current: Deviation) => Deviation }
  ) => {
    const { signature, action = `Status updated to ${newStatus}`, mutateDeviation } = options || {}

    setDeviations(currentDeviations =>
      (currentDeviations || []).map(dev => {
        if (dev.id !== deviation.id) return dev
        let updated: Deviation = { ...dev, status: newStatus }
        if (mutateDeviation) {
          updated = mutateDeviation(updated)
        }
        if (signature) {
          const record = createDeviationSignature(deviation, action, signature)
          updated.signatures = [...(dev.signatures || []), record]
        }
        return updated
      })
    )

    if (newStatus === 'investigating') {
      ensureInvestigationForDeviation(deviation)
      setInvestigations(current =>
        (current || []).map(inv =>
          inv.deviationId === deviation.id
            ? { ...inv, status: 'analysis' }
            : inv
        )
      )
    }

    if (newStatus === 'resolved' || newStatus === 'closed') {
      const statusUpdate = newStatus === 'resolved' ? 'effectiveness' : 'closed'
      setInvestigations(current =>
        (current || []).map(inv =>
          inv.deviationId === deviation.id
            ? { ...inv, status: statusUpdate }
            : inv
        )
      )

      if (newStatus === 'closed') {
        notifyQualityEventResolved(deviation.id)
        const metadata = deviation.metadata as Record<string, unknown> | undefined
        const automationId = typeof metadata?.automationSuggestionId === 'string' ? metadata.automationSuggestionId : undefined
        if (automationId) {
          markAutomationSuggestion(automationId, {
            deviationClosedAt: new Date().toISOString(),
          })
        }
      }
    }

    const module = signature ? 'workflow' : 'deviation'
    const logAction = signature ? action : 'Deviation Status Updated'
    const logDetails = signature
      ? `${deviation.id}: ${action}. Reason: ${signature.reason}`
      : `${deviation.id} set to ${newStatus}`
    const userOverride = signature
      ? {
          id: signature.userId,
          role: 'Quality Approver',
          ipAddress: '127.0.0.1',
          sessionId: `sess-esign-${deviation.id.slice(-4)}`,
        }
      : undefined

    toast.success(`Deviation ${deviation.id} status updated to ${newStatus}`)
    log(logAction, module, logDetails, {
      recordId: deviation.id,
      digitalSignature: signature?.digitalSignature,
      userOverride,
    })
    const alertSeverity = deviationStatusAlertSeverity[newStatus] ?? 'info'
    const statusTitle = newStatus === 'closed' ? 'closed' : `status ${newStatus}`
    const reasonDetails = signature?.reason ? ` Reason: ${signature.reason}` : ''
    const actorDetails = signature?.userId ? ` by ${signature.userId}` : ''
    recordAlert(`Deviation ${deviation.id} ${statusTitle}`, `${action}${actorDetails}.${reasonDetails}`, {
      severity: alertSeverity,
      source: 'quality',
      relatedRecordId: deviation.id,
      context: {
        status: newStatus,
        action,
        actor: signature?.userId,
        reason: signature?.reason,
      },
    })
  }

  const openRecordCreation = (type: 'deviation' | 'capa' | 'change-control') => {
    switch (type) {
      case 'deviation':
        navigateQuality('deviation/new')
        log('Open Deviation Creation', 'deviation', 'Opened deviation creation workflow', { recordId: 'deviation-new' })
        break
      case 'capa':
        navigateQuality('capa/new')
        log('Open CAPA Wizard', 'capa', 'Initiated CAPA creation workflow', { recordId: 'capa-new' })
        break
      case 'change-control':
        navigateQuality('cc/new')
        log('Open Change Control Creation', 'change-control', 'Opened change control creation workflow', { recordId: 'cc-new' })
        break
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Quality Management System</h1>
          <p className="text-muted-foreground">Manage deviations, investigations, CAPAs, and change controls</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Quality Record
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Start a new workflow</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(event) => {
                event.preventDefault()
                openRecordCreation('deviation')
              }}
            >
              <Warning className="h-4 w-4 text-red-500" />
              Log deviation
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(event) => {
                event.preventDefault()
                openRecordCreation('capa')
              }}
            >
              <ListChecks className="h-4 w-4 text-blue-500" />
              Create CAPA
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(event) => {
                event.preventDefault()
                openRecordCreation('change-control')
              }}
            >
              <FileText className="h-4 w-4 text-amber-500" />
              Initiate change control
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === activeTab) return
          setActiveTab(value as QualityTab)
          log(`Navigate to ${value}`, 'navigation', `Switched to ${value} tab`, { recordId: value })
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deviations">Deviations</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="capa">CAPA</TabsTrigger>
          <TabsTrigger value="change-control">Change Control</TabsTrigger>
        </TabsList>

        <TabsContent value="deviations" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">{(deviations || []).filter(d => d.status === 'open').length}</div>
                  <div className="text-sm text-muted-foreground">Open</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{(deviations || []).filter(d => d.status === 'investigating').length}</div>
                  <div className="text-sm text-muted-foreground">Investigating</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{(deviations || []).filter(d => d.status === 'resolved').length}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">{(deviations || []).filter(d => d.severity === 'critical').length}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={() => openRecordCreation('deviation')}>
              <Plus className="h-4 w-4 mr-2" />
              Log Deviation
            </Button>
          </div>

          {pendingAutomation.length > 0 && (
            <Card className="border border-dashed border-primary/60 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Robot className="h-5 w-5" />
                  Digital Twin Automation Queue
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {pendingAutomation.length} AI recommendation{pendingAutomation.length > 1 ? 's' : ''} require quality approval before execution.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingAutomation.map((suggestion) => {
                  const measurement = suggestion.measurement
                  const label = parameterLabels[suggestion.parameter]
                  const unit = parameterUnits[suggestion.parameter]
                  const deviation = (deviations || []).find(dev => dev.id === suggestion.deviationId)
                  const currentValue = measurement ? `${measurement.currentValue.toFixed(2)} ${unit}` : '—'
                  const targetValue = measurement ? `${measurement.target.toFixed(2)} ${unit}` : '—'
                  const boundsDisplay = measurement?.bounds ? `${measurement.bounds.min.toFixed(2)}–${measurement.bounds.max.toFixed(2)} ${unit}` : undefined
                  const deltaDisplay = measurement ? `${(measurement.currentValue - measurement.target).toFixed(2)} ${unit}` : '—'

                  return (
                    <div key={suggestion.id} className="rounded-lg border bg-background/70 shadow-sm">
                      <div className="border-b p-4 flex flex-wrap justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 uppercase" >
                              {suggestion.trigger}
                            </Badge>
                            <span className="font-semibold text-sm text-muted-foreground">Batch {deviation?.batchId}</span>
                          </div>
                          <h4 className="font-medium text-lg leading-tight">{suggestion.summary}</h4>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>Detected: {new Date(suggestion.createdAt).toLocaleString()}</div>
                          <div>Assignee: <span className="font-semibold text-foreground">{suggestion.assignee}</span></div>
                        </div>
                      </div>

                      <div className="p-4 grid gap-4 md:grid-cols-[2fr,1fr]">
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-semibold text-muted-foreground">Recommended Actions</h5>
                            <ul className="mt-2 space-y-2 text-sm list-disc list-inside">
                              {suggestion.actions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                          {suggestion.trigger === 'OOT' && (
                            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/70 text-amber-900 p-3 text-sm">
                              Trend alert: trajectory indicates imminent specification breach. Approve to pre-emptively escalate investigation.
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-md border bg-muted/40 p-3 text-sm">
                            <div className="font-semibold mb-2 text-muted-foreground">{label} telemetry</div>
                            <div className="flex flex-col gap-1">
                              <span>Current: <strong>{currentValue}</strong></span>
                              <span>Target: {targetValue}</span>
                              {boundsDisplay && (
                                <span>Limits: {boundsDisplay}</span>
                              )}
                              <span>Deviation: {deltaDisplay}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <ESignaturePrompt
                              trigger={(
                                <Button className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Approve Plan
                                </Button>
                              )}
                              title={`Approve automation plan for ${suggestion.deviationId}`}
                              statement={`Approve digital twin recommendation ${suggestion.id} for deviation ${suggestion.deviationId}`}
                              demoCredentials={deviationSignatureDemo}
                              onConfirm={async (result) => {
                                await handleAutomationApproval(suggestion, result)
                              }}
                            />
                            <ESignaturePrompt
                              trigger={(
                                <Button variant="outline" className="flex items-center gap-2">
                                  <Warning className="h-4 w-4" />
                                  Dismiss Plan
                                </Button>
                              )}
                              title={`Dismiss automation plan ${suggestion.id}`}
                              statement={`Dismiss digital twin recommendation ${suggestion.id} for deviation ${suggestion.deviationId}`}
                              demoCredentials={deviationSignatureDemo}
                              onConfirm={async (result) => {
                                await handleAutomationDismissal(suggestion, result)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {automationHistory.length > 0 && (
              <Card className="border border-dashed">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Automation decisions audit trail
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Captures quality approvals and rejections of AI-assisted plans for traceability.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {automationHistory.map(entry => {
                    const decisionTimestamp = entry.resolvedAt ?? entry.createdAt
                    return (
                      <div key={entry.id} className="border rounded-md p-3 bg-muted/50">
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <div className="font-medium text-foreground">
                            {entry.id} — {entry.status.toUpperCase()} • {entry.deviationId}
                          </div>
                          <div className="text-muted-foreground">
                            Decision: {new Date(decisionTimestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          By {entry.decisionBy || 'Unknown'} • Confidence {entry.aiConfidence}
                        </div>
                        {entry.decisionReason && (
                          <div className="mt-2 text-sm">Reason: {entry.decisionReason}</div>
                        )}
                        {entry.decisionSignatureId && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Signature ID: {entry.decisionSignatureId}
                          </div>
                        )}
                        {entry.deviationClosedAt && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Closed: {new Date(entry.deviationClosedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {(deviations || []).map((deviation) => {
              const automationMetadata = (deviation.metadata ?? {}) as {
                trigger?: string
                parameter?: AutomationSuggestion['parameter']
                currentValue?: number
                target?: number
                bounds?: { min: number; max: number }
                compliance?: number
                productionContext?: {
                  stage?: string
                  status?: string
                  progress?: number
                  equipment?: string[]
                  timeline?: Array<{
                    stage?: string
                    startTime?: string
                    endTime?: string
                    status?: string
                  }>
                }
                alcoa?: {
                  observedAt?: string
                  recordedAt?: string
                  recordedBy?: string
                  dataSource?: string
                  dataIntegrityChecksum?: string
                }
              }
              const parameter = automationMetadata.parameter
              const parameterLabel = parameter ? (parameterLabels[parameter] ?? parameter) : undefined
              const parameterUnit = parameter ? (parameterUnits[parameter] ?? '') : ''
              const measurement = {
                currentValue: typeof automationMetadata.currentValue === 'number' ? automationMetadata.currentValue : undefined,
                target: typeof automationMetadata.target === 'number' ? automationMetadata.target : undefined,
                bounds: automationMetadata.bounds,
                compliance: typeof automationMetadata.compliance === 'number' ? automationMetadata.compliance : undefined,
              }
              const hasMeasurement =
                measurement.currentValue !== undefined ||
                measurement.target !== undefined ||
                measurement.bounds !== undefined ||
                measurement.compliance !== undefined
              const compliancePercent =
                typeof measurement.compliance === 'number'
                  ? Math.round(Math.max(0, Math.min(1, measurement.compliance)) * 100)
                  : undefined
              const productionContext = automationMetadata.productionContext
              const fallbackBatch = batchLookup.get(deviation.batchId)
              const timelineEntries = Array.isArray(productionContext?.timeline)
                ? (productionContext?.timeline as Array<{
                  stage?: string
                  startTime?: string
                  endTime?: string
                  status?: string
                }>)
                : fallbackBatch
                  ? fallbackBatch.timeline.map(item => ({
                    stage: item.stage,
                    startTime: item.startTime instanceof Date ? item.startTime.toISOString() : new Date(item.startTime).toISOString(),
                    endTime: item.endTime ? (item.endTime instanceof Date ? item.endTime.toISOString() : new Date(item.endTime).toISOString()) : undefined,
                    status: item.status,
                  }))
                  : []
              const progressValue = typeof productionContext?.progress === 'number'
                ? Math.max(0, Math.min(100, productionContext.progress))
                : fallbackBatch
                  ? Math.max(0, Math.min(100, fallbackBatch.progress))
                  : undefined
              const contextStage = productionContext?.stage ?? fallbackBatch?.stage
              const contextStatus = productionContext?.status ?? fallbackBatch?.status
              const contextEquipment = productionContext?.equipment ?? fallbackBatch?.equipment ?? []
              const showProductionContext = Boolean(productionContext || fallbackBatch)
              const alcoa = automationMetadata.alcoa

              const openArchiveView = (targetBatchId: string) => {
                navigateQuality(`archive/${targetBatchId}`)
                log('Open Batch Archive', 'navigation', `Archive view opened for ${targetBatchId}`, {
                  recordId: targetBatchId,
                })
              }

              const currentBatch = fallbackBatch
              const relatedBatchHistory = currentBatch
                ? batchSource.filter(batch => batch.product === currentBatch.product && batch.id !== currentBatch.id).slice(0, 3)
                : []

              return (
                <Card key={deviation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-medium">{deviation.id}</span>
                          <Badge className={getSeverityColor(deviation.severity)}>
                            {deviation.severity}
                          </Badge>
                          <Badge className={getStatusColor(deviation.status)}>
                            {deviation.status}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{deviation.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{deviation.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Batch: {deviation.batchId}</span>
                          <span>Reported by: {deviation.reportedBy}</span>
                          <span>Date: {formatDate(deviation.reportedDate)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MagnifyingGlass className="h-4 w-4 mr-2" />
                              Investigate
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Deviation Investigation - {deviation.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="grid gap-4">
                                <div>
                                  <Label>Title</Label>
                                  <div className="font-medium">{deviation.title}</div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <div>{deviation.description}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label>Severity</Label>
                                    <Badge className={getSeverityColor(deviation.severity)}>
                                      {deviation.severity}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge className={getStatusColor(deviation.status)}>
                                      {deviation.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Batch ID</Label>
                                    <div className="font-mono">{deviation.batchId}</div>
                                  </div>
                                </div>
                              </div>

                              {(hasMeasurement || productionContext || alcoa) && (
                                <div className="space-y-4">
                                  {hasMeasurement && (
                                    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs uppercase tracking-wide text-muted-foreground/80">
                                          Process Parameter Snapshot
                                        </Label>
                                        {compliancePercent !== undefined && (
                                          <Badge variant="outline" className="text-xs">
                                            Compliance {compliancePercent}%
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {parameterLabel ? (
                                          <span className="font-semibold text-foreground">{parameterLabel}</span>
                                        ) : (
                                          <span>Process Parameter</span>
                                        )}
                                      </div>
                                      <div className="grid gap-1 text-sm">
                                        {measurement.currentValue !== undefined && (
                                          <span>Current: <strong>{measurement.currentValue.toFixed(2)} {parameterUnit}</strong></span>
                                        )}
                                        {measurement.target !== undefined && (
                                          <span>Target: {measurement.target.toFixed(2)} {parameterUnit}</span>
                                        )}
                                        {measurement.bounds && (
                                          <span>
                                            Limits: {measurement.bounds.min.toFixed(2)}–{measurement.bounds.max.toFixed(2)} {parameterUnit}
                                          </span>
                                        )}
                                      </div>
                                      {automationMetadata.trigger && (
                                        <div className="text-xs text-muted-foreground/80">
                                          Triggered by {automationMetadata.trigger}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {showProductionContext && (
                                    <div className="rounded-lg border border-dashed bg-background/80 p-4 space-y-4">
                                      <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground/80">
                                              Production Context
                                            </Label>
                                            <Button
                                              variant="link"
                                              className="px-0 h-auto text-xs"
                                              onClick={() => openArchiveView(deviation.batchId)}
                                            >
                                              <LinkSimple className="h-3 w-3 mr-1" />
                                              View archive record
                                            </Button>
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Stage: <span className="font-medium text-foreground">{contextStage || 'Unknown'}</span>
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            Status: <span className="font-medium text-foreground">{contextStatus || 'Unknown'}</span>
                                          </div>
                                          {contextEquipment.length > 0 && (
                                            <div className="text-xs text-muted-foreground/80">
                                              Equipment: {contextEquipment.join(', ')}
                                            </div>
                                          )}
                                        </div>
                                        {progressValue !== undefined && (
                                          <div className="min-w-[200px] space-y-1">
                                            <div className="text-xs text-muted-foreground">
                                              Progress {Math.round(progressValue)}%
                                            </div>
                                            <Progress value={progressValue} />
                                          </div>
                                        )}
                                      </div>
                                      {timelineEntries.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                                            Batch Timeline
                                          </div>
                                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {timelineEntries.map((step, index) => (
                                              <div
                                                key={`${step?.stage || 'stage'}-${index}`}
                                                className="rounded-md border bg-muted/30 p-3 text-xs space-y-1"
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                  <span className="font-medium text-foreground">{step?.stage || 'Stage'}</span>
                                                  {step?.status && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                      {step.status}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                  Start: {formatDateTime(step?.startTime)}
                                                </div>
                                                {step?.endTime && (
                                                  <div className="text-[11px] text-muted-foreground">
                                                    End: {formatDateTime(step.endTime)}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {relatedBatchHistory.length > 0 && (
                                        <div className="pt-3 border-t border-dashed border-muted-foreground/30 space-y-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                                            Related Batches
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {relatedBatchHistory.map(batch => (
                                              <Button
                                                key={batch.id}
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => openArchiveView(batch.id)}
                                              >
                                                <span className="font-mono mr-2">{batch.id}</span>
                                                <span>{batch.stage}</span>
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {alcoa && (
                                    <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                                      <Label className="text-xs uppercase tracking-wide text-muted-foreground/80">
                                        ALCOA++ Record Trace
                                      </Label>
                                      <div className="grid gap-1 text-xs text-muted-foreground">
                                        <div>
                                          <span className="font-semibold text-foreground">Observed:</span> {formatDateTime(alcoa.observedAt)}
                                        </div>
                                        <div>
                                          <span className="font-semibold text-foreground">Recorded:</span> {formatDateTime(alcoa.recordedAt)}
                                        </div>
                                        {alcoa.recordedBy && (
                                          <div>
                                            <span className="font-semibold text-foreground">Recorded By:</span> {alcoa.recordedBy}
                                          </div>
                                        )}
                                        {alcoa.dataSource && (
                                          <div>
                                            <span className="font-semibold text-foreground">Source:</span> {alcoa.dataSource}
                                          </div>
                                        )}
                                        {alcoa.dataIntegrityChecksum && (
                                          <div className="text-[11px] text-muted-foreground break-all">
                                            <span className="font-semibold text-foreground">Checksum:</span> {alcoa.dataIntegrityChecksum}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="space-y-4">
                              <div className="flex gap-2 flex-wrap items-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => openAssistant('deviation', deviation.id)}
                                      className="flex items-center gap-2"
                                    >
                                      <Robot className="h-4 w-4" />
                                      AI Root Cause Analysis
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Generate a guided root cause narrative with inline citations.
                                  </TooltipContent>
                                </Tooltip>

                                {deviation.status === 'open' && (
                                  <ESignaturePrompt
                                    trigger={(
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" className="flex items-center gap-2">
                                            <PlayCircle className="h-4 w-4" />
                                            Start Investigation
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Capture QA authorization before transitioning into analysis.
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    title="Launch Investigation"
                                    statement={`Authorize investigation start for ${deviation.id}`}
                                    demoCredentials={deviationSignatureDemo}
                                    onConfirm={async (result) => {
                                      updateDeviationStatus(deviation, 'investigating', {
                                        signature: result,
                                        action: 'Investigation Initiated',
                                      })
                                    }}
                                  />
                                )}

                                {deviation.status !== 'resolved' && deviation.status !== 'closed' && (
                                  <ESignaturePrompt
                                    trigger={(
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Mark Resolved
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Document QA approval of the remediation and evidence summary.
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    title="Resolve Deviation"
                                    statement={`Resolution approval for ${deviation.id}`}
                                    demoCredentials={deviationSignatureDemo}
                                    onConfirm={async (result) => {
                                      updateDeviationStatus(deviation, 'resolved', {
                                        signature: result,
                                        action: 'Deviation Resolution Approved',
                                      })
                                    }}
                                  />
                                )}

                                {deviation.status === 'resolved' && (
                                  <ESignaturePrompt
                                    trigger={(
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" className="flex items-center gap-2">
                                            <SealCheck className="h-4 w-4" />
                                            Close Deviation
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Final QA closeout with effectiveness verification captured.
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    title="Close Deviation"
                                    statement={`Final closure authorization for ${deviation.id}`}
                                    demoCredentials={deviationSignatureDemo}
                                    onConfirm={async (result) => {
                                      updateDeviationStatus(deviation, 'closed', {
                                        signature: result,
                                        action: 'Deviation Closed',
                                      })
                                    }}
                                  />
                                )}
                              </div>
                              
                              <div>
                                <Label htmlFor="investigation-notes">Investigation Notes</Label>
                                <Textarea
                                  id="investigation-notes"
                                  placeholder="Enter investigation findings, data analysis, and conclusions..."
                                  value={investigationNotes}
                                  onChange={(e) => setInvestigationNotes(e.target.value)}
                                  className="min-h-32"
                                />
                              </div>

                              {(deviation.signatures && deviation.signatures.length > 0) && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label>Electronic Signatures</Label>
                                    <Badge variant="outline" className="text-xs">
                                      {deviation.signatures.length} captured
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {deviation.signatures.map((signature, index) => {
                                      const signedAt = signature.signedAt instanceof Date
                                        ? signature.signedAt
                                        : new Date(signature.signedAt)
                                      return (
                                        <div
                                          key={signature.id}
                                          className="rounded-lg border bg-muted/40 p-4 shadow-sm"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                              <div className="rounded-full bg-primary/10 p-2 text-primary">
                                                <SealCheck className="h-4 w-4" />
                                              </div>
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium leading-tight">{signature.action}</span>
                                                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                                    Step {index + 1}
                                                  </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                  Signed by <span className="font-medium">{signature.signedBy}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {signedAt.toLocaleString()}
                                                </div>
                                              </div>
                                            </div>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => copySignatureHash(signature.digitalSignature)}
                                                >
                                                  <CopySimple className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Copy signature hash</TooltipContent>
                                            </Tooltip>
                                          </div>
                                          {signature.reason && (
                                            <div className="mt-3 rounded-md border border-dashed border-muted-foreground/40 bg-background/80 p-3 text-sm text-muted-foreground">
                                              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                                                Justification
                                              </div>
                                              <p className="mt-1 leading-relaxed">{signature.reason}</p>
                                            </div>
                                          )}
                                          <div className="mt-3 text-[11px] font-mono text-muted-foreground break-all">
                                            Hash: {signature.digitalSignature}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          ensureInvestigationForDeviation(deviation)
                          navigateQuality(`investigation/${deviation.id}`)
                          log('Open Investigation Workflow', 'workflow', `Opened workflow for ${deviation.id}`, { recordId: deviation.id })
                        }}
                      >
                        <ListChecks className="h-4 w-4 mr-2" />
                        Open Workflow
                      </Button>
                      
                      {deviation.severity === 'high' || deviation.severity === 'critical' ? (
                        <Button variant="destructive" size="sm" className="pulse-critical">
                          <Warning className="h-4 w-4 mr-2" />
                          Urgent
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          </div>
        </TabsContent>

        <TabsContent value="investigations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlass className="h-5 w-5" />
                Active Investigations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {((investigations || []).filter(inv => inv.status !== 'closed')).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No active investigations. Launch an investigation from the Deviations tab to track progress here.
                  </div>
                ) : (
                  (investigations || [])
                    .filter(inv => inv.status !== 'closed')
                    .map(inv => {
                      const relatedDeviation = (deviations || []).find(d => d.id === inv.deviationId)
                      const { totalTasks, completedTasks, inProgressTasks, progress } = calculateInvestigationProgress(inv)
                      return (
                        <div key={inv.id} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{inv.deviationId} — {relatedDeviation?.title ?? inv.title}</span>
                              <Badge>{formatInvestigationStatus(inv.status)}</Badge>
                              <Badge className={getRiskBadgeColor(inv.riskLevel)}>Risk: {inv.riskLevel}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Lead: {inv.lead || relatedDeviation?.assignedTo || 'Unassigned'} • Due {formatDate(inv.targetCompletion)}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="min-w-[160px]">
                                <Progress value={progress} />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {completedTasks}/{totalTasks} tasks complete
                                {inProgressTasks > 0 ? ` • ${inProgressTasks} in progress` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigateQuality(`investigation/${inv.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Workflow
                            </Button>
                            <Button
                              size="sm"
                              disabled={!relatedDeviation}
                              onClick={() => relatedDeviation && openAssistant('deviation', relatedDeviation.id)}
                            >
                              <Robot className="h-4 w-4 mr-2" />
                              AI Assist
                            </Button>
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capa" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{(capas || []).filter(c => c.status === 'draft').length}</div>
                  <div className="text-sm text-muted-foreground">Draft</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{(capas || []).filter(c => c.status === 'approved').length}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">{(capas || []).filter(c => c.status === 'implementing').length}</div>
                  <div className="text-sm text-muted-foreground">Implementing</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">{(capas || []).filter(c => c.status === 'complete').length}</div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={() => openRecordCreation('capa')}>
              <Plus className="h-4 w-4 mr-2" />
              New CAPA
            </Button>
          </div>

          <div className="space-y-4">
            {(capas || []).map((capa) => (
              <Card key={capa.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-medium">{capa.id}</span>
                        <Badge variant={capa.type === 'corrective' ? 'default' : 'secondary'}>
                          {capa.type}
                        </Badge>
                        <Badge className={getStatusColor(capa.status)}>
                          {capa.status}
                        </Badge>
                        <Badge variant="outline">
                          {capa.priority} priority
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{capa.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{capa.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>Due: {formatDate(capa.dueDate)}</span>
                        <span>Assigned to: {capa.assignedTo}</span>
                        <span>Actions: {capa.actions.length}</span>
                        {capa.effectivenessCheck && (
                          <span>Effectiveness check: {formatDate(capa.effectivenessCheck.dueDate)} ({capa.effectivenessCheck.status})</span>
                        )}
                      </div>
                      {capa.relatedDeviations.length > 0 && (
                        <div className="mt-2 text-sm">
                          Related deviations: {capa.relatedDeviations.map((devId, idx) => (
                            <Button key={devId} variant="link" className="px-1" onClick={() => navigateQuality(`deviation/${devId}`)}>
                              {devId}{idx < capa.relatedDeviations.length - 1 ? ',' : ''}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openAssistant('capa', capa.id)} className="flex items-center gap-2">
                        <Robot className="h-4 w-4" />
                        Assistant
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { navigateQuality(`capa/${capa.id}/review`); log('Open CAPA Review', 'capa', `Opened CAPA ${capa.id}`, { recordId: capa.id }) }}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { navigateQuality(`capa/${capa.id}/timeline`); log('Open CAPA Timeline', 'capa', `Opened CAPA ${capa.id}`, { recordId: capa.id }) }}>
                        <Clock className="h-4 w-4 mr-2" />
                        Timeline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="change-control" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Change Controls</h2>
            <Button onClick={() => openRecordCreation('change-control')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Change Request
            </Button>
          </div>

          <div className="grid gap-4">
            {(changeControls || []).map(cc => (
              <Card key={cc.id} className="hover:shadow-sm">
                <CardContent className="p-5 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium">{cc.id}</span>
                      <Badge variant="outline">{cc.status}</Badge>
                      <Badge variant="outline">Risk: {cc.riskLevel}</Badge>
                    </div>
                    <div className="font-semibold">{cc.title}</div>
                    <div className="text-sm text-muted-foreground mb-2">Requested by {cc.requestedBy} on {new Date(cc.requestedDate).toLocaleDateString()}</div>
                    <div className="text-sm">Impacted batches: {cc.impactedBatches.join(', ') || 'None'} • Impacted equipment: {cc.impactedEquipment.join(', ') || 'None'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Window: {formatDate(cc.plannedStartDate)} → {formatDate(cc.plannedEndDate)} • Related deviations: {(cc.relatedDeviations || []).join(', ') || 'None'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openAssistant('change-control', cc.id)} className="flex items-center gap-2">
                      <Robot className="h-4 w-4" />
                      Assistant
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { navigateQuality(`cc/${cc.id}`); log('Open Change Control', 'change-control', `Opened ${cc.id}`, { recordId: cc.id }) }}>
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <QualityAssistantPanel
        open={assistantOpen}
        onOpenChange={handleAssistantVisibility}
        deviations={deviations || []}
        capas={capas || []}
        changeControls={changeControls || []}
        automationQueue={automationQueue || []}
        onLog={log}
        initialMode={assistantMode}
        initialRecordId={assistantRecordId}
      />
    </div>
  )
}