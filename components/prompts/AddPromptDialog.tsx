'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useCreatePrompt, useMonitors } from '@/hooks'
import type { Monitor } from '@/lib/types'

interface AddPromptDialogProps {
  projectId: string
  trigger?: React.ReactNode
}

export function AddPromptDialog({ projectId, trigger }: AddPromptDialogProps) {
  const [open, setOpen] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [monitorId, setMonitorId] = useState('')
  const [intentType, setIntentType] = useState<'organic' | 'commercial'>('organic')
  const [tags, setTags] = useState('')

  const { data: monitors, isLoading: monitorsLoading } = useMonitors(projectId)
  const createPrompt = useCreatePrompt()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!promptText.trim() || !monitorId) return

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    try {
      await createPrompt.mutateAsync({
        monitor_id: monitorId,
        prompt_text: promptText.trim(),
        intent_type: intentType,
        tags: tagArray,
      })

      // Reset form and close
      setPromptText('')
      setMonitorId('')
      setIntentType('organic')
      setTags('')
      setOpen(false)
    } catch (error) {
      console.error('Failed to create prompt:', error)
    }
  }

  const hasMonitors = monitors && monitors.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription>
            Create a prompt to track how AI models respond to questions about your brand.
          </DialogDescription>
        </DialogHeader>

        {!hasMonitors && !monitorsLoading ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              You need to create a monitor before adding prompts.
            </p>
            <Button variant="outline" onClick={() => setOpen(false)} asChild>
              <a href={`/brand/${projectId}/monitors`}>Go to Monitors</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monitor</label>
              <Select value={monitorId} onValueChange={setMonitorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a monitor" />
                </SelectTrigger>
                <SelectContent>
                  {monitors?.map((monitor: Monitor) => (
                    <SelectItem key={monitor.id} value={monitor.id}>
                      {monitor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which monitor this prompt belongs to
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt Text</label>
              <Textarea
                placeholder="e.g., What is the best personal injury lawyer in Dallas?"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The question that will be asked to AI models
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Intent Type</label>
              <Select value={intentType} onValueChange={(v) => setIntentType(v as 'organic' | 'commercial')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organic (Informational)</SelectItem>
                  <SelectItem value="commercial">Commercial (Transactional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (optional)</label>
              <Input
                placeholder="e.g., local, services, pricing"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated tags for organizing prompts
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!promptText.trim() || !monitorId || createPrompt.isPending}>
                {createPrompt.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Prompt'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
