'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AI_MODELS, AI_MODEL_LABELS, type AIModel } from '@/lib/types'
import { useCreateMonitor, useUpdateMonitor } from '@/hooks'
import { Loader2 } from 'lucide-react'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
]

const LOCATIONS = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'Global', label: 'Global' },
]

interface MonitorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  monitor?: {
    id: string
    name: string
    language: string
    location: string
    ai_models: AIModel[]
    is_active: boolean
  }
}

export function MonitorForm({ open, onOpenChange, projectId, monitor }: MonitorFormProps) {
  const isEditing = !!monitor

  const [name, setName] = useState(monitor?.name || '')
  const [language, setLanguage] = useState(monitor?.language || 'en')
  const [location, setLocation] = useState(monitor?.location || 'US')
  const [selectedModels, setSelectedModels] = useState<AIModel[]>(
    monitor?.ai_models || [...AI_MODELS]
  )
  const [error, setError] = useState('')

  const createMonitor = useCreateMonitor()
  const updateMonitor = useUpdateMonitor()

  const isLoading = createMonitor.isPending || updateMonitor.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Monitor name is required')
      return
    }

    if (selectedModels.length === 0) {
      setError('Select at least one AI model')
      return
    }

    try {
      if (isEditing && monitor) {
        await updateMonitor.mutateAsync({
          id: monitor.id,
          name: name.trim(),
          language,
          location,
          ai_models: selectedModels,
        })
      } else {
        await createMonitor.mutateAsync({
          project_id: projectId,
          name: name.trim(),
          language,
          location,
          ai_models: selectedModels,
          is_active: true,
        })
      }

      // Reset form and close
      setName('')
      setLanguage('en')
      setLocation('US')
      setSelectedModels([...AI_MODELS])
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const toggleModel = (model: AIModel) => {
    setSelectedModels((prev) =>
      prev.includes(model)
        ? prev.filter((m) => m !== model)
        : [...prev, model]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Monitor' : 'Create Monitor'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update your monitor settings.'
                : 'Set up a new AI visibility monitor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Monitor Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Reviews Monitor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">AI Models</label>
              <div className="flex flex-wrap gap-2">
                {AI_MODELS.map((model) => (
                  <Button
                    key={model}
                    type="button"
                    variant={selectedModels.includes(model) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleModel(model)}
                  >
                    {AI_MODEL_LABELS[model]}
                  </Button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Monitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
