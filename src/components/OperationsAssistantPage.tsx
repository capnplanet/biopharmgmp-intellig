import { FloatingOperationsAssistant } from '@/components/FloatingOperationsAssistant'

export function OperationsAssistantPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-card/60 px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Operations Copilot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with the assistant in a full workspace view with room for historical responses and follow-up prompts.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <FloatingOperationsAssistant variant="page" />
      </div>
    </div>
  )
}

export default OperationsAssistantPage
