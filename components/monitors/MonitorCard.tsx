'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AI_MODEL_LABELS, type AIModel, type Monitor } from '@/lib/types'
import { useUpdateMonitor, useDeleteMonitor } from '@/hooks'
import { MoreVertical, Play, Pause, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'

interface MonitorCardProps {
  monitor: Monitor & { prompts?: { id: string }[] }
  onEdit: () => void
}

export function MonitorCard({ monitor, onEdit }: MonitorCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const updateMonitor = useUpdateMonitor()
  const deleteMonitor = useDeleteMonitor()

  const promptsCount = monitor.prompts?.length || 0
  const isUpdating = updateMonitor.isPending
  const isDeleting = deleteMonitor.isPending

  const handleToggleActive = async () => {
    await updateMonitor.mutateAsync({
      id: monitor.id,
      is_active: !monitor.is_active,
    })
  }

  const handleDelete = async () => {
    await deleteMonitor.mutateAsync(monitor.id)
    setDeleteDialogOpen(false)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/monitors/${monitor.id}`}
                className="hover:underline"
              >
                {monitor.name}
              </Link>
            </CardTitle>
            <CardDescription>
              {monitor.language.toUpperCase()} / {monitor.location}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/monitors/${monitor.id}`}>
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {monitor.ai_models.map((model) => (
              <Badge key={model} variant="secondary" className="text-xs">
                {AI_MODEL_LABELS[model as AIModel] || model}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {promptsCount} prompt{promptsCount !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground">
              Created {formatDistanceToNow(monitor.created_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={monitor.is_active ? 'default' : 'secondary'}>
              {monitor.is_active ? 'Active' : 'Paused'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : monitor.is_active ? (
                <>
                  <Pause className="mr-1 h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Resume
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Monitor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{monitor.name}"? This action cannot be undone.
              All associated prompts, responses, and citations will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
