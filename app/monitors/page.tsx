'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, MonitorDot, Loader2 } from 'lucide-react'
import { useMonitors, useProjects } from '@/hooks'
import { MonitorForm, MonitorCard } from '@/components/monitors'
import type { Monitor } from '@/lib/types'

export default function MonitorsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null)

  const { data: monitors, isLoading: monitorsLoading } = useMonitors()
  const { data: projects, isLoading: projectsLoading } = useProjects()

  const isLoading = monitorsLoading || projectsLoading
  const defaultProjectId = projects?.[0]?.id || ''

  const handleEdit = (monitor: Monitor) => {
    setEditingMonitor(monitor)
    setFormOpen(true)
  }

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingMonitor(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
            <p className="text-muted-foreground">
              Manage your AI visibility monitors
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Empty state
  if (!monitors || monitors.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
            <p className="text-muted-foreground">
              Manage your AI visibility monitors
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <MonitorDot className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No monitors yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create your first monitor to start tracking your brand visibility across AI models like ChatGPT, Claude, Gemini, and more.
          </p>
          <Button onClick={() => setFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Monitor
          </Button>
        </div>

        {defaultProjectId && (
          <MonitorForm
            open={formOpen}
            onOpenChange={handleCloseForm}
            projectId={defaultProjectId}
            monitor={editingMonitor || undefined}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
          <p className="text-muted-foreground">
            Manage your AI visibility monitors
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Monitor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {monitors.map((monitor) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor as Monitor & { prompts?: { id: string }[] }}
            onEdit={() => handleEdit(monitor)}
          />
        ))}
      </div>

      {defaultProjectId && (
        <MonitorForm
          open={formOpen}
          onOpenChange={handleCloseForm}
          projectId={defaultProjectId}
          monitor={editingMonitor || undefined}
        />
      )}
    </div>
  )
}
