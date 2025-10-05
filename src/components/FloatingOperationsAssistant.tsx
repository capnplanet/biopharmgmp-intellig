import { useCallback, useEffect, useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getSpark } from '@/lib/spark'
import { useOperationsAssistant } from '@/hooks/use-operations-assistant'
import { Robot, Sparkle, PaperPlaneTilt, X, Question, ListBullets } from '@phosphor-icons/react'

const MAX_MESSAGES = 12
const MAX_SUGGESTIONS = 3

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const quickPrompts = [
  'Summarize the biggest production risks right now.',
  'Which equipment should maintenance focus on?',
  'How are deviation rates trending compared to thresholds?',
  'Recommend actions for the pending automation queue.',
]

const defaultSuggestedPrompts = quickPrompts.slice(0, MAX_SUGGESTIONS)

const FOLLOW_UP_KEYWORDS: Record<string, string[]> = {
  deviation: ['deviation', 'nonconformance', 'investigation', 'risk', 'batch risk', 'capa'],
  equipment: ['equipment', 'oee', 'failure', 'maintenance', 'telemetry', 'vibration'],
  quality: ['quality', 'yield', 'first-pass', 'compliance'],
  automation: ['automation', 'queue', 'bot', 'recommendation'],
  alerts: ['alert', 'alarm', 'warning'],
  batches: ['batch', 'lot', 'production', 'stage'],
  progress: ['progress', 'complete', 'completion', 'finish', 'eta', 'timeline'],
}

const areSuggestionsEqual = (next: string[], current: string[]) =>
  next.length === current.length && next.every((value, index) => value === current[index])

export function FloatingOperationsAssistant() {
  const digest = useOperationsAssistant()
  const [open = false, setOpen] = useKV<boolean>('operations-assistant-open', false)
  const [messages = [], setMessages] = useKV<AssistantMessage[]>('operations-assistant-history', [])
  const [suggestedPrompts = defaultSuggestedPrompts, setSuggestedPrompts] = useKV<string[]>('operations-assistant-suggestions', defaultSuggestedPrompts)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const latestSummary = useMemo(() => digest.summary, [digest.summary])

  const detectTopics = useCallback((text?: string) => {
    const matches = new Set<string>()
    if (!text) return matches
    const normalized = text.toLowerCase()
    Object.entries(FOLLOW_UP_KEYWORDS).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        matches.add(topic)
      }
    })
    return matches
  }, [])

  const buildFollowUpSuggestions = useCallback((history: AssistantMessage[]) => {
    const assistantMessage = [...history].reverse().find(message => message.role === 'assistant')
    if (!assistantMessage) {
      return defaultSuggestedPrompts.slice()
    }

    const lastUserMessage = [...history].reverse().find(message => message.role === 'user')
    const topics = new Set<string>()
    detectTopics(assistantMessage.content).forEach(topic => topics.add(topic))
    detectTopics(lastUserMessage?.content).forEach(topic => topics.add(topic))

    const prompts: string[] = []
    const addPrompt = (prompt?: string) => {
      if (!prompt) return
      if (!prompts.includes(prompt)) {
        prompts.push(prompt)
      }
    }

    addPrompt('Can you expand on those recommendations with owner assignments and timing?')

    const topDeviation = digest.batches.topDeviationRisks[0]
    if ((topics.has('deviation') || topics.has('batches')) && topDeviation) {
      addPrompt(`Outline immediate mitigation steps for batch ${topDeviation.id} (${topDeviation.risk}% deviation risk).`)
    }

    const progressLeader = digest.batches.closestToCompletion
    if (progressLeader) {
      addPrompt(`Provide the remaining steps and ETA to finish batch ${progressLeader.id} (${progressLeader.progress}% complete${progressLeader.etaHours != null ? `, ~${progressLeader.etaHours}h remaining` : ''}).`)
    }

    if (topics.has('equipment') && digest.equipment.highestRisk) {
      addPrompt(`Would proactive maintenance on ${digest.equipment.highestRisk.name} reduce the ${digest.equipment.highestRisk.risk}% failure risk?`)
    }

    if (topics.has('quality')) {
      addPrompt(`Break down how we can improve first-pass yield beyond the current ${digest.metrics.firstPassRate}% rate.`)
    }

    if (topics.has('automation') && digest.automation.pending > 0) {
      addPrompt(`Prioritize which of the ${digest.automation.pending} pending automation recommendations should be approved first.`)
    }

    if (topics.has('alerts') && digest.alerts.bySeverity.error > 0) {
      addPrompt(`Which of the ${digest.alerts.bySeverity.error} error-level alerts require escalation this shift?`)
    }

    if (!prompts.length) {
      addPrompt('Could you translate that response into specific shift-level actions?')
    }

    defaultSuggestedPrompts.forEach(fallback => addPrompt(fallback))

    return prompts.slice(0, MAX_SUGGESTIONS)
  }, [detectTopics, digest])

  const applySuggestions = useCallback((next: string[]) => {
    if (!areSuggestionsEqual(next, suggestedPrompts)) {
      setSuggestedPrompts(next)
    }
  }, [suggestedPrompts, setSuggestedPrompts])

  useEffect(() => {
    if (!messages.length) {
      applySuggestions(defaultSuggestedPrompts.slice())
      return
    }

    const nextSuggestions = buildFollowUpSuggestions(messages.slice(-MAX_MESSAGES))
    applySuggestions(nextSuggestions)
  }, [messages, buildFollowUpSuggestions, applySuggestions])

  const appendMessage = (message: AssistantMessage) => {
    setMessages((current = []) => {
      const next = [...current, message]
      const trimmed = next.slice(-MAX_MESSAGES)
      if (message.role === 'assistant') {
        const followUps = buildFollowUpSuggestions(trimmed)
        applySuggestions(followUps)
      }
      return trimmed
    })
  }

  const askAssistant = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    const now = new Date()
    const userMessage: AssistantMessage = {
      id: `${now.getTime()}-user`,
      role: 'user',
      content: trimmed,
      createdAt: now.toISOString(),
    }
    appendMessage(userMessage)
    setInput('')
    const spark = getSpark()
    if (!spark?.llm || !spark.llmPrompt) {
      appendMessage({
        id: `${now.getTime()}-error`,
        role: 'assistant',
        content: 'AI assistant is currently unavailable. Ensure Spark runtime is connected.',
        createdAt: new Date().toISOString(),
      })
      return
    }

    try {
      setLoading(true)
      const prompt = spark.llmPrompt`
        You are the "Operations Copilot" for a GMP manufacturing command center. Answer questions precisely, citing current metrics when available. Provide concise bullet recommendations and highlight any compliance considerations.

        OPERATIONS SNAPSHOT (UTC ${digest.updatedAt.toISOString()}):
        ${latestSummary}

        STRUCTURED DATA (JSON):
        ${JSON.stringify({
          metrics: digest.metrics,
          batches: digest.batches,
          equipment: digest.equipment,
          qualityRecords: digest.qualityRecords,
          alerts: digest.alerts,
          automation: digest.automation,
          modelPerformance: digest.modelPerformance,
        }, null, 2)}

        When citing values, mention units (%, counts, etc.) and note if they breach thresholds (e.g., deviation risk threshold ${digest.batches.highRiskThreshold}%).
        Use batches.details for live progress percentages and etaHours to answer completion timeline questions precisely.

        Question:
        ${trimmed}
      `
      const output = await spark.llm(prompt, 'gpt-4o')
      appendMessage({
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: output,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      appendMessage({
        id: `${Date.now()}-assistant-error`,
        role: 'assistant',
        content: `Unable to generate a response: ${message}`,
        createdAt: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void askAssistant(input)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <Card className="w-[380px] shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Robot className="h-5 w-5 text-primary" />
                  Operations Copilot
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Answers questions across production, analytics, equipment, quality, and automation using the latest digital-twin snapshot.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Live</Badge>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close operations assistant">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 rounded-md border bg-muted/40 text-xs text-muted-foreground p-2 flex items-start gap-2">
              <ListBullets className="h-4 w-4 text-muted-foreground" />
              <span className="whitespace-pre-line leading-5">{latestSummary}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ScrollArea className="h-56 rounded-md border bg-background/60">
              <div className="space-y-3 p-3">
                {messages.length === 0 && !loading ? (
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>Ask about KPIs, deviation risk, equipment health, or automation impact. The assistant responds with real-time context.</p>
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map(prompt => (
                        <Button
                          key={prompt}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void askAssistant(prompt)}
                          className="text-xs h-7"
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        'rounded-md px-3 py-2 text-xs leading-5 shadow-sm border',
                        message.role === 'user'
                          ? 'ml-auto max-w-[85%] bg-primary text-primary-foreground border-primary/40'
                          : 'mr-auto max-w-[90%] bg-muted/40 text-foreground border-border/40'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {message.role === 'user' ? 'You' : 'Operations Copilot'}
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-[11px]">
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="mr-auto max-w-[90%] rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Sparkle className="h-3.5 w-3.5 animate-spin text-primary" />
                    Generating response…
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.some(message => message.role === 'assistant') && suggestedPrompts.length > 0 && (
              <div className="rounded-md border border-border/40 bg-muted/20 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Suggested follow-ups
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedPrompts.map(prompt => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void askAssistant(prompt)}
                      className="h-auto min-h-[2.25rem] w-full sm:w-auto max-w-full whitespace-normal break-words text-left text-xs leading-tight px-3 py-2 justify-start items-start"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <Textarea
                placeholder="Ask about production, analytics, equipment, compliance…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                className="resize-none"
                disabled={loading}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Question className="h-3.5 w-3.5" />
                      <span>Context auto-updates from the digital twin every tick.</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-xs text-left">
                    Includes batches, equipment telemetry, deviation and CAPA status, automation queue, model metrics, and alert counts.
                  </TooltipContent>
                </Tooltip>
                <Button type="submit" size="sm" disabled={loading || !input.trim()} className="flex items-center gap-2">
                  <PaperPlaneTilt className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="lg"
            className="h-12 w-12 rounded-full shadow-lg"
            variant="default"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close operations assistant' : 'Open operations assistant'}
          >
            {open ? <X className="h-5 w-5" /> : <Robot className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {open ? 'Hide operations copilot' : 'Ask the operations copilot'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default FloatingOperationsAssistant
