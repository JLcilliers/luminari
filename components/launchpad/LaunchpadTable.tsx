'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Target,
  Fuel,
  Loader2,
  ExternalLink,
  CheckCircle,
  PenTool,
  Trash2,
} from 'lucide-react'
import type { LaunchpadItem } from '@/lib/types'
import { LAUNCHPAD_SOURCE_LABELS, LAUNCHPAD_SOURCE_COLORS } from '@/lib/types'
import { useRemoveFromLaunchpad } from '@/hooks'

interface LaunchpadTableProps {
  items: LaunchpadItem[]
  isLoading: boolean
  emptyMessage?: string
  projectId: string
  onCreateContent: (item: LaunchpadItem) => void
}

export function LaunchpadTable({
  items,
  isLoading,
  emptyMessage = 'No items in launchpad yet.',
  projectId,
  onCreateContent,
}: LaunchpadTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const removeFromLaunchpad = useRemoveFromLaunchpad()

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleRemove = async (item: LaunchpadItem) => {
    if (confirm('Remove this item from launchpad?')) {
      await removeFromLaunchpad.mutateAsync(item)
    }
  }

  const getPriorityColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    if (score >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getSourceIcon = (source: string) => {
    if (source === 'answer_gap') {
      return <Target className="h-4 w-4" style={{ color: LAUNCHPAD_SOURCE_COLORS.answer_gap }} />
    }
    return <Fuel className="h-4 w-4" style={{ color: LAUNCHPAD_SOURCE_COLORS.keyword_fueler }} />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Target className="h-12 w-12 mb-4 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={selectedIds.size === items.length && items.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead className="w-[100px]">Source</TableHead>
            <TableHead className="w-[100px] text-center">Priority</TableHead>
            <TableHead className="w-[100px] text-center">Gap</TableHead>
            <TableHead className="w-[100px] text-center">Status</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.content_created ? 'opacity-60' : ''}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelection(item.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{item.title}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.visibility_pct !== undefined && (
                      <span>Visibility: {item.visibility_pct}%</span>
                    )}
                    {item.search_volume && (
                      <span>Vol: {item.search_volume.toLocaleString()}</span>
                    )}
                    {item.keyword_difficulty !== undefined && (
                      <span>KD: {item.keyword_difficulty}</span>
                    )}
                    {item.intent_type && (
                      <Badge variant="outline" className="text-xs">
                        {item.intent_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getSourceIcon(item.source)}
                  <span className="text-xs text-muted-foreground">
                    {LAUNCHPAD_SOURCE_LABELS[item.source]}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${getPriorityColor(item.priority_score)}`}
                  />
                  <span className="font-medium">{item.priority_score}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={item.content_gap_pct >= 70 ? 'destructive' : 'secondary'}
                >
                  {item.content_gap_pct}%
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {item.content_created ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Created
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!item.content_created && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onCreateContent(item)}
                    >
                      <PenTool className="h-3 w-3 mr-1" />
                      Create
                    </Button>
                  )}
                  {item.content_created && item.last_content_id && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/content-library?id=${item.last_content_id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(item)}
                    disabled={removeFromLaunchpad.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="border-t p-3 bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
