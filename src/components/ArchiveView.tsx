import React, { useMemo, useState } from 'react'
import { batches, type BatchData } from '@/data/seed'
import { buildInvestigationSources, type InvestigationSource } from '@/data/archive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Clock,
  DownloadSimple,
  Factory,
  FunnelSimple,
  ListMagnifyingGlass,
  MagnifyingGlass,
  Note,
} from '@phosphor-icons/react'

const typeLabels: Record<InvestigationSource['type'], { label: string; tone: string }> = {
  'batch-record': { label: 'Batch Record', tone: 'bg-primary/10 text-primary border-primary/20' },
  'equipment-telemetry': { label: 'Equipment Telemetry', tone: 'bg-blue-100 text-blue-900 border-blue-200' },
  'calibration-record': { label: 'Calibration', tone: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  'gmp-guidance': { label: 'GMP Guidance', tone: 'bg-amber-100 text-amber-900 border-amber-200' },
  'maintenance-log': { label: 'Maintenance Log', tone: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  'capa-history': { label: 'CAPA History', tone: 'bg-purple-100 text-purple-900 border-purple-200' },
  'audit-event': { label: 'Audit Trail', tone: 'bg-rose-100 text-rose-900 border-rose-200' },
  'trend-data': { label: 'Trend Data', tone: 'bg-slate-100 text-slate-900 border-slate-200' },
  'operator-log': { label: 'Operator Log', tone: 'bg-zinc-100 text-zinc-900 border-zinc-200' },
  'material-record': { label: 'Material Record', tone: 'bg-teal-100 text-teal-900 border-teal-200' },
}

const typeIconMap: Partial<Record<InvestigationSource['type'], React.ComponentType<{ className?: string }>>> = {
  'batch-record': Factory,
  'equipment-telemetry': FunnelSimple,
  'calibration-record': Clock,
  'gmp-guidance': Note,
  'audit-event': ListMagnifyingGlass,
}

const getTypeVisuals = (type: InvestigationSource['type']) => {
  const meta = typeLabels[type] ?? { label: type, tone: 'bg-muted text-foreground border-border' }
  const Icon = typeIconMap[type]
  return { ...meta, Icon }
}

type ArchiveViewProps = {
  batchId?: string
  onBack: () => void
}

const formatDateTime = (value?: Date | string) => {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

const describeBatch = (batch?: BatchData) => {
  if (!batch) return 'Unknown batch'
  return `${batch.product} • ${batch.stage} • ${batch.status.toUpperCase()}`
}

const sanitizeSourceForExport = (source: InvestigationSource) => ({
  ...source,
  lastUpdated: source.lastUpdated ? new Date(source.lastUpdated).toISOString() : undefined,
})

export function ArchiveView({ batchId, onBack }: ArchiveViewProps) {
  const [search, setSearch] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState(() => {
    if (batchId && batches.some(b => b.id === batchId)) return batchId
    return batches[0]?.id ?? ''
  })

  const selectedBatch = useMemo(() => batches.find(b => b.id === selectedBatchId), [selectedBatchId])

  const filteredBatches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return batches
    return batches.filter(batch => {
      const haystack = [batch.id, batch.product, batch.stage, batch.status].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [search])

  const sources = useMemo(() => buildInvestigationSources(selectedBatchId), [selectedBatchId])

  const exportArchive = () => {
    if (!selectedBatch) return
    const payload = {
      exportedAt: new Date().toISOString(),
      batch: {
        ...selectedBatch,
        startTime: selectedBatch.startTime.toISOString(),
        timeline: selectedBatch.timeline.map(item => ({
          ...item,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime ? item.endTime.toISOString() : undefined,
        })),
      },
      sources: sources.map(sanitizeSourceForExport),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedBatch.id}-archive.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const historicalBatches = useMemo(() => {
    if (!selectedBatch) return []
    return batches.filter(batch => batch.product === selectedBatch.product && batch.id !== selectedBatch.id)
  }, [selectedBatch])

  return (
    <div className="p-6 space-y-6 overflow-auto h-full bg-background">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" onClick={onBack} className="px-0 text-sm"> 
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quality
          </Button>
          <h1 className="text-3xl font-bold">Regulated Archive Library</h1>
          <p className="text-muted-foreground text-sm">
            Review immutable batch records, supporting evidence, and compliance metadata for historical investigations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportArchive} disabled={!selectedBatch}>
            <DownloadSimple className="h-4 w-4 mr-2" />
            Export Archive Package
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr] items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search batches</label>
              <div className="relative">
                <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by ID, product, or status" className="pl-9" />
                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-2">
                {filteredBatches.map(batch => {
                  const isActive = batch.id === selectedBatchId
                  return (
                    <Button
                      key={batch.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start flex-col items-start gap-1"
                      onClick={() => setSelectedBatchId(batch.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{batch.id}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {batch.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{batch.product}</div>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Batch</span>
                    <Badge variant="outline" className="font-mono text-sm">{selectedBatch?.id ?? '—'}</Badge>
                  </div>
                  <div className="text-lg font-semibold mt-2">{describeBatch(selectedBatch)}</div>
                </div>
                {selectedBatch && (
                  <div className="min-w-[160px]">
                    <div className="text-xs text-muted-foreground mb-1">Progress</div>
                    <Progress value={selectedBatch.progress} />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {selectedBatch ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary">Stage: {selectedBatch.stage}</Badge>
                    <Badge variant="secondary">Started: {selectedBatch.startTime.toLocaleString()}</Badge>
                    <Badge variant="secondary">Equipment: {selectedBatch.equipment.join(', ')}</Badge>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 mb-1">Timeline</h4>
                    <div className="space-y-2">
                      {selectedBatch.timeline.map((item, index) => (
                        <div key={`${item.stage}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-foreground">{item.stage}</div>
                            <div className="text-xs">Start: {item.startTime.toLocaleString()}</div>
                            {item.endTime && (
                              <div className="text-xs">End: {item.endTime.toLocaleString()}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="uppercase text-[10px] tracking-wide">{item.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>No batch selected.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historical Evidence Bundle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <div className="text-sm text-muted-foreground">No archived material found for this batch.</div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {sources.map(source => {
                    const { label, tone, Icon } = getTypeVisuals(source.type)
                    return (
                      <AccordionItem key={source.id} value={source.id} className="border rounded-lg">
                        <AccordionTrigger className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-2">
                              {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                              <span className="font-semibold text-foreground">{source.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`${tone} text-[10px] uppercase tracking-wide`}>
                                {label}
                              </Badge>
                              {source.lastUpdated && (
                                <span className="text-xs text-muted-foreground">Updated {formatDateTime(source.lastUpdated)}</span>
                              )}
                              {source.author && (
                                <span className="text-xs text-muted-foreground">Author: {source.author}</span>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="text-sm leading-relaxed whitespace-pre-line">
                            {source.content}
                          </div>
                          {source.meta && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              <pre className="bg-muted/60 p-2 rounded-md overflow-x-auto">
                                {JSON.stringify(source.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                          {source.compliance && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className={source.compliance.alcoa ? 'border-emerald-300 text-emerald-800' : 'border-muted-foreground/40'}>
                                ALCOA: {source.compliance.alcoa ? 'Yes' : 'No'}
                              </Badge>
                              <Badge variant="outline" className={source.compliance.cfr21Part11 ? 'border-emerald-300 text-emerald-800' : 'border-muted-foreground/40'}>
                                21 CFR Part 11: {source.compliance.cfr21Part11 ? 'Yes' : 'No'}
                              </Badge>
                              <Badge variant="outline" className={source.compliance.dataIntegrity ? 'border-emerald-300 text-emerald-800' : 'border-muted-foreground/40'}>
                                Data Integrity: {source.compliance.dataIntegrity ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {historicalBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Related Batch History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {historicalBatches.map(batch => (
                  <div key={batch.id} className="flex flex-wrap justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{batch.id}</Badge>
                      <span className="text-muted-foreground">{batch.stage}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Started {batch.startTime.toLocaleDateString()}</span>
                      <Button variant="link" className="px-0 h-auto text-xs" onClick={() => setSelectedBatchId(batch.id)}>
                        View record
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArchiveView
