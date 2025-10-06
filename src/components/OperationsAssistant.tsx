import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getSpark } from '@/lib/spark'
import { useOperationsAssistant } from '@/hooks/use-operations-assistant'
import { Robot, Sparkle, PaperPlaneTilt, ArrowCounterClockwise, ListBullets } from '@phosphor-icons/react'

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const MAX_HISTORY = 50

export function OperationsAssistant() {
  const digest = useOperationsAssistant()

  const [messages = [], setMessages] = useKV<AssistantMessage[]>('operations-assistant-history', [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const latestSummary = useMemo(() => digest.summary, [digest.summary])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isAtBottomRef = useRef(true)

  const appendMessage = useCallback((message: AssistantMessage) => {
    setMessages((current = []) => {
      const next = [...current, message].slice(-MAX_HISTORY)
      return next
    })
  }, [setMessages])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => {
      const threshold = 24
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
      isAtBottomRef.current = atBottom
    }
    el.addEventListener('scroll', handler)
    handler()
    return () => el.removeEventListener('scroll', handler)
  }, [])

  // Auto-scroll disabled: user has full manual control over chat window scrolling.

  const handleClear = useCallback(() => {
    setMessages(() => [])
    setInput('')
  }, [setMessages])

  const buildFallbackResponse = useCallback((question: string) => {
    const lines: string[] = []
    lines.push(latestSummary)
    lines.push('_(Generated from the latest operations snapshot—Spark runtime not connected.)_')
    return lines.join('\n')
  }, [latestSummary])

  const askAssistant = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    const now = new Date()
    const userMessage: AssistantMessage = { id: `${now.getTime()}-user`, role: 'user', content: trimmed, createdAt: now.toISOString() }
    appendMessage(userMessage)
    setInput('')
    const spark = getSpark()
    if (!spark?.llm || !spark.llmPrompt) {
      appendMessage({ id: `${now.getTime()}-fallback`, role: 'assistant', content: buildFallbackResponse(trimmed), createdAt: new Date().toISOString() })
      return
    }

    try {
      setLoading(true)
      setRateLimited(false)
      setRetryCount(0)
      const prompt = spark.llmPrompt`
        You are the "Operations Copilot" for a GMP manufacturing command center. Answer precisely with metrics and concise actions.

        OPERATIONS SNAPSHOT (UTC ${digest.updatedAt.toISOString()}):
        ${latestSummary}

        STRUCTURED DATA (JSON):
        ${JSON.stringify({ metrics: digest.metrics, batches: digest.batches, equipment: digest.equipment, qualityRecords: digest.qualityRecords, alerts: digest.alerts, automation: digest.automation, modelPerformance: digest.modelPerformance }, null, 2)}

        Question:
        ${trimmed}
      `
      const maxRetries = 3
      const baseDelayMs = 750
      let output = ''
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const o = await spark.llm(prompt, 'gpt-4o')
          output = typeof o === 'string' ? o : ''
          setRateLimited(false)
          setRetryCount(0)
          break
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
          const is429 = msg.includes('429') || msg.includes('rate limit')
          if (!is429 || attempt === maxRetries) throw err
          setRateLimited(true)
          setRetryCount(attempt + 1)
          const delay = baseDelayMs * Math.pow(2, attempt)
          await new Promise(res => setTimeout(res, delay))
        }
      }
      const cleaned = output.trim()
      const responseContent = cleaned.length > 0 ? output : buildFallbackResponse(trimmed)
      appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', content: responseContent, createdAt: new Date().toISOString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      appendMessage({ id: `${Date.now()}-assistant-error`, role: 'assistant', content: `${buildFallbackResponse(trimmed)}\n\nError details: ${message}`, createdAt: new Date().toISOString() })
    } finally {
      setLoading(false)
      setRateLimited(false)
      setRetryCount(0)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    void askAssistant(input)
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Robot className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Operations Copilot</span>
            <Badge variant="outline" className="text-[10px] uppercase">Live</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={loading || messages.length === 0}>
                  <ArrowCounterClockwise className="h-4 w-4" /> Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear chat history</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="View latest operations snapshot">
                  <ListBullets className="h-4 w-4" /> Snapshot
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="max-w-sm whitespace-pre-line text-xs leading-5">
                <div className="font-medium text-muted-foreground/80 mb-1">Latest snapshot</div>
                {latestSummary}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
        <div className="space-y-3">
          {rateLimited && (
            <div className="mr-auto max-w-[90%] rounded-md border border-border/40 bg-amber-100/60 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
              <Sparkle className="h-3.5 w-3.5" /> Rate limited — retrying {retryCount}/3…
            </div>
          )}
          {messages.length === 0 && !loading ? (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Ask about KPIs, deviation risk, equipment health, or automation impact. The assistant responds with real-time context.</p>
              <div className="flex flex-wrap gap-2">
                {['Summarize current production risks','Which equipment needs maintenance?','Deviation rates vs thresholds?','Top automation approvals?'].map(prompt => (
                  <Button key={prompt} type="button" variant="secondary" size="sm" onClick={() => void askAssistant(prompt)} className="text-xs h-7">
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={cn('rounded-md px-3 py-2 text-xs leading-5 shadow-sm border', m.role === 'user' ? 'ml-auto max-w-[85%] bg-primary text-primary-foreground border-primary/40' : 'mr-auto max-w-[90%] bg-muted/40 text-foreground border-border/40')}>
                <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {m.role === 'user' ? 'You' : 'Operations Copilot'}
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="whitespace-pre-wrap text-[11px]">{m.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className="mr-auto max-w-[90%] rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkle className="h-3.5 w-3.5 animate-spin text-primary" /> Generating response…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 z-10 border-t border-border bg-card/80 backdrop-blur px-3 py-3">
        <div className="flex items-end gap-2">
          <Textarea placeholder="Ask about production, analytics, equipment, compliance…" value={input} onChange={e => setInput(e.target.value)} rows={3} className="resize-none" disabled={loading} />
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="flex items-center gap-2">
            <PaperPlaneTilt className="h-4 w-4" /> Send
          </Button>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">Context auto-updates from the digital twin every tick.</div>
      </form>
    </div>
  )
}

export default OperationsAssistant
