import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createDigitalSignature } from '@/utils/signature'
import { useCurrentUser } from '@/hooks/use-current-user'

export interface SignatureResult {
  userId: string
  reason: string
  timestamp: Date
  digitalSignature: string
}

interface ESignaturePromptProps {
  trigger: React.ReactNode
  title: string
  statement: string
  onConfirm: (result: SignatureResult) => Promise<void> | void
  demoCredentials?: {
    username: string
    password: string
  }
}

export function ESignaturePrompt({ trigger, title, statement, onConfirm, demoCredentials }: ESignaturePromptProps) {
  const [open, setOpen] = useState(false)
  const { user } = useCurrentUser()
  const [username, setUsername] = useState(user?.id || '')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState(statement)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setPassword('')
    setReason(statement)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    setOpen(next)
  }

  const handleSubmit = async () => {
    if (!username || !password || !reason) {
      toast.error('Please provide username, password, and justification')
      return
    }

    try {
      setSubmitting(true)
      const { signature, timestamp } = await createDigitalSignature({ userId: username, password, reason })
      const result: SignatureResult = {
        userId: username,
        reason,
        timestamp,
        digitalSignature: signature
      }
      await onConfirm(result)
      toast.success('Electronic signature applied')
      handleOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error('Unable to capture electronic signature')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Electronic signature required. Provide credentials and justification to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="esign-username">Username</Label>
            <Input
              id="esign-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="esign-password">Password</Label>
            <Input
              id="esign-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="esign-reason">Justification</Label>
            <Textarea
              id="esign-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the decision or approval context"
              className="min-h-24"
            />
          </div>

          {demoCredentials && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <div className="font-medium text-sm mb-1">Demo credentials</div>
              <div>Username: {demoCredentials.username}</div>
              <div>Password: {demoCredentials.password}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Signing…' : 'Sign & Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
