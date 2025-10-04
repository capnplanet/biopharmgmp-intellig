import { Deviation, Investigation, InvestigationStage, InvestigationStatus, InvestigationTask, InvestigationTaskStatus } from "@/types/quality"

const addBusinessDays = (base: Date, days: number) => {
  const date = new Date(base)
  let remaining = days
  while (remaining > 0) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      remaining -= 1
    }
  }
  return date
}

const initialTasksForDeviation = (deviation: Deviation): InvestigationTask[] => {
  const now = new Date()
  return [
    {
      id: `${deviation.id}-containment-1`,
      title: "Secure impacted materials",
      description: "Isolate all in-process and finished goods related to the deviation.",
      owner: deviation.assignedTo || "Manufacturing",
      dueDate: addBusinessDays(now, 0),
      status: "in-progress",
      notes: "Auto-generated from deviation trigger",
    },
    {
      id: `${deviation.id}-containment-2`,
      title: "Notify stakeholders",
      description: "Alert QA, manufacturing, and regulatory stakeholders of the deviation.",
      owner: "Quality Systems",
      dueDate: addBusinessDays(now, 0),
      status: "pending",
    },
  ]
}

export const createInvestigationFromDeviation = (deviation: Deviation): Investigation => {
  const now = new Date()
  const riskLevel: Investigation["riskLevel"] =
    deviation.severity === "critical" || deviation.severity === "high"
      ? "high"
      : deviation.severity === "medium"
        ? "medium"
        : "low"

  const rootCauseTasks: InvestigationTask[] = [
    {
      id: `${deviation.id}-root-cause-1`,
      title: "Collect process evidence",
      description: "Pull historian data, batch records, and sensor logs for deviation timeframe.",
      owner: "Process Analytics",
      dueDate: addBusinessDays(now, 1),
      status: "pending",
    },
    {
      id: `${deviation.id}-root-cause-2`,
      title: "Facilitate root cause session",
      description: "Run 5-Why/ fishbone workshop with cross-functional team to identify hypotheses.",
      owner: deviation.assignedTo || "Quality Lead",
      dueDate: addBusinessDays(now, 2),
      status: "pending",
    },
  ]

  const correctiveTasks: InvestigationTask[] = [
    {
      id: `${deviation.id}-corrective-1`,
      title: "Draft CAPA proposal",
      description: "Summarize required corrective and preventive actions and route for approval.",
      owner: "Quality",
      dueDate: addBusinessDays(now, 4),
      status: "pending",
    },
    {
      id: `${deviation.id}-corrective-2`,
      title: "Assess product impact",
      description: "Document risk assessment and product disposition recommendation.",
      owner: "Manufacturing",
      dueDate: addBusinessDays(now, 3),
      status: "pending",
    },
  ]

  const verificationTasks: InvestigationTask[] = [
    {
      id: `${deviation.id}-verification-1`,
      title: "Schedule effectiveness check",
      description: "Plan verification of CAPA outcomes once implemented.",
      owner: "Quality Systems",
      dueDate: addBusinessDays(now, 6),
      status: "pending",
    },
  ]

  return {
    id: deviation.id,
    deviationId: deviation.id,
    title: `Investigation - ${deviation.title}`,
    severity: deviation.severity,
    lead: deviation.assignedTo || "Quality",
    status: "triage",
    riskLevel,
    startedOn: now,
    targetCompletion: addBusinessDays(now, riskLevel === "high" ? 5 : 7),
    relatedCapas: [],
    timeline: [
      {
        id: `${deviation.id}-timeline-1`,
        timestamp: now,
        summary: "Investigation initiated",
        actor: deviation.reportedBy,
        details: `${deviation.reportedBy} opened investigation from deviation ${deviation.id}`,
      },
    ],
    stages: [
      {
        id: "containment",
        title: "Immediate Containment",
        description: "Stabilize process conditions and quarantine affected product.",
        gate: "containment",
        tasks: initialTasksForDeviation(deviation),
      },
      {
        id: "root-cause",
        title: "Root Cause Analysis",
        description: "Gather evidence and determine primary and contributing causes.",
        gate: "root-cause",
        tasks: rootCauseTasks,
      },
      {
        id: "corrective",
        title: "Corrective & Preventive Planning",
        description: "Define CAPA actions and document product disposition.",
        gate: "corrective",
        tasks: correctiveTasks,
      },
      {
        id: "verification",
        title: "Verification & Closure",
        description: "Plan and execute post-CAPA effectiveness checks.",
        gate: "verification",
        tasks: verificationTasks,
      },
    ],
    effectivenessReview: {
      dueDate: addBusinessDays(now, 30),
      status: "pending",
      notes: "Schedule follow-up effectiveness assessment post CAPA completion.",
    },
  }
}

export const calculateInvestigationProgress = (investigation: Investigation) => {
  const tasks = investigation.stages.flatMap((stage) => stage.tasks)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "complete").length
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  return { totalTasks, completedTasks, inProgressTasks, progress }
}

export const deriveInvestigationStatus = (
  stages: InvestigationStage[],
  fallback: InvestigationStatus
): InvestigationStatus => {
  const sequence: Array<{ gate: InvestigationStage["gate"]; status: InvestigationStatus }> = [
    { gate: "containment", status: "triage" },
    { gate: "root-cause", status: "analysis" },
    { gate: "corrective", status: "corrective-actions" },
    { gate: "verification", status: "effectiveness" },
    { gate: "effectiveness", status: "effectiveness" },
  ]

  for (const { gate, status } of sequence) {
    const stage = stages.find((s) => s.gate === gate)
    if (stage && stage.tasks.some((task) => task.status !== "complete")) {
      return status
    }
  }

  return fallback === "closed" ? fallback : "closed"
}

export const normalizeInvestigation = (investigation: Investigation): Investigation => ({
  ...investigation,
  startedOn: new Date(investigation.startedOn as unknown as string),
  targetCompletion: new Date(investigation.targetCompletion as unknown as string),
  effectivenessReview: investigation.effectivenessReview
    ? {
        ...investigation.effectivenessReview,
        dueDate: new Date(investigation.effectivenessReview.dueDate as unknown as string),
      }
    : undefined,
  timeline: investigation.timeline.map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp as unknown as string),
  })),
  stages: investigation.stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => ({
      ...task,
      dueDate: new Date(task.dueDate as unknown as string),
      completedOn: task.completedOn ? new Date(task.completedOn as unknown as string) : undefined,
    })),
  })),
})

export const cycleTaskStatus = (status: InvestigationTaskStatus): InvestigationTaskStatus => {
  switch (status) {
    case "pending":
      return "in-progress"
    case "in-progress":
      return "complete"
    default:
      return "pending"
  }
}
