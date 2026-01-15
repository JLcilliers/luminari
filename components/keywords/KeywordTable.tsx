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
  Send,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Keyword, KeywordIntent, KeywordTrend } from '@/lib/types'
import { KEYWORD_INTENT_COLORS, KEYWORD_INTENT_LABELS } from '@/lib/types'
import { useDeleteKeyword } from '@/hooks'
import { useQueryClient } from '@tanstack/react-query'

interface KeywordTableProps {
  keywords: Keyword[]
  projectId: string
  showSource?: boolean
  showCompetitor?: boolean
  isLoading?: boolean
  emptyMessage?: string
}

function getTrendIcon(trend?: KeywordTrend) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function getIntentBadge(intent?: KeywordIntent) {
  if (!intent) return null
  return (
    <Badge
      variant="outline"
      style={{ borderColor: KEYWORD_INTENT_COLORS[intent], color: KEYWORD_INTENT_COLORS[intent] }}
    >
      {KEYWORD_INTENT_LABELS[intent]}
    </Badge>
  )
}

function getDifficultyColor(difficulty?: number): string {
  if (!difficulty) return 'text-gray-400'
  if (difficulty <= 30) return 'text-green-500'
  if (difficulty <= 60) return 'text-yellow-500'
  return 'text-red-500'
}

function getOpportunityColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 50) return 'bg-blue-500'
  if (score >= 30) return 'bg-yellow-500'
  return 'bg-gray-400'
}

export function KeywordTable({
  keywords,
  projectId,
  showSource = false,
  showCompetitor = false,
  isLoading = false,
  emptyMessage = 'No keywords found',
}: KeywordTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sendingToLaunchpad, setSendingToLaunchpad] = useState(false)
  const deleteKeyword = useDeleteKeyword()
  const queryClient = useQueryClient()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(keywords.filter((k) => !k.sent_to_launchpad).map((k) => k.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleSendToLaunchpad = async () => {
    if (selectedIds.size === 0) return

    setSendingToLaunchpad(true)
    try {
      const { error } = await supabase
        .from('keywords')
        .update({ sent_to_launchpad: true } as never)
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast.success(`${selectedIds.size} keyword${selectedIds.size !== 1 ? 's' : ''} added to Launchpad`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send keywords to Launchpad')
    } finally {
      setSendingToLaunchpad(false)
    }
  }

  const handleDelete = async (keywordId: string) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      await deleteKeyword.mutateAsync({ projectId, keywordId })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (keywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  const selectableKeywords = keywords.filter((k) => !k.sent_to_launchpad)
  const allSelected = selectableKeywords.length > 0 && selectedIds.size === selectableKeywords.length

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="font-medium">{selectedIds.size} keyword{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
            <Button onClick={handleSendToLaunchpad} disabled={sendingToLaunchpad}>
              {sendingToLaunchpad ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send {selectedIds.size} to Launchpad
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableKeywords.length === 0}
                />
              </TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Difficulty</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead className="text-center">Trend</TableHead>
              <TableHead className="text-right">Gap %</TableHead>
              <TableHead className="text-center">Score</TableHead>
              {showSource && <TableHead>Source</TableHead>}
              {showCompetitor && <TableHead>Competitor</TableHead>}
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((keyword) => (
              <TableRow key={keyword.id} className={keyword.sent_to_launchpad ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(keyword.id)}
                    onCheckedChange={(checked) => handleSelectOne(keyword.id, checked as boolean)}
                    disabled={keyword.sent_to_launchpad}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {keyword.keyword}
                    {keyword.landing_page && (
                      <a
                        href={keyword.landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {keyword.sent_to_launchpad && (
                      <Badge variant="default" className="ml-2">
                        In Launchpad
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {keyword.search_volume?.toLocaleString() || '-'}
                </TableCell>
                <TableCell className={`text-right ${getDifficultyColor(keyword.keyword_difficulty)}`}>
                  {keyword.keyword_difficulty ?? '-'}
                </TableCell>
                <TableCell className="text-right">
                  {keyword.cpc ? `$${keyword.cpc.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>{getIntentBadge(keyword.intent_type)}</TableCell>
                <TableCell className="text-center">{getTrendIcon(keyword.trend)}</TableCell>
                <TableCell className="text-right">{keyword.content_gap_pct}%</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getOpportunityColor(keyword.opportunity_score)}`}
                    />
                    <span className="text-sm">{keyword.opportunity_score}</span>
                  </div>
                </TableCell>
                {showSource && (
                  <TableCell>
                    <Badge variant="outline">{keyword.source}</Badge>
                  </TableCell>
                )}
                {showCompetitor && (
                  <TableCell className="text-sm text-muted-foreground">
                    {keyword.competitor_source || '-'}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(keyword.id)}
                    disabled={deleteKeyword.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
