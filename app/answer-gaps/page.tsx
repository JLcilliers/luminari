'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  Search,
  Lightbulb,
  TrendingUp,
  Building2,
  ArrowUpDown,
  Loader2,
  Target,
  ExternalLink,
} from 'lucide-react'
import { usePrompts, useProjects, useCompetitors, type PromptWithResponses } from '@/hooks'

type SortField = 'priority' | 'prompt_text' | 'competitor_count' | 'visibility_pct'
type SortDirection = 'asc' | 'desc'

interface GapAnalysis {
  promptId: string
  promptText: string
  intentType: 'organic' | 'commercial'
  monitorName: string
  mentionsBrand: boolean
  competitorsMentioned: string[]
  competitorCount: number
  totalResponses: number
  visibilityPct: number
  priority: 'high' | 'medium' | 'low'
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return ''
  }
}

export default function AnswerGapsPage() {
  const { data: prompts, isLoading: promptsLoading } = usePrompts()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: competitors, isLoading: competitorsLoading } = useCompetitors(projects?.[0]?.id)

  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const isLoading = promptsLoading || projectsLoading || competitorsLoading
  const trackedBrand = projects?.[0]?.tracked_brand?.toLowerCase()
  const competitorNames = competitors?.map(c => c.name.toLowerCase()) || []

  // Analyze gaps - prompts where competitors are mentioned but brand isn't
  const gapAnalysis: GapAnalysis[] = useMemo(() => {
    if (!prompts || !trackedBrand) return []

    return prompts.map((prompt: PromptWithResponses) => {
      const responses = prompt.responses || []

      const totalResponses = responses.length
      const mentionsBrand = responses.some(r => r.mentions_brand)

      // Find which competitors are mentioned
      const competitorsMentioned = new Set<string>()
      responses.forEach(r => {
        const brands = r.brands_mentioned || []
        brands.forEach(brand => {
          const brandLower = brand.toLowerCase()
          if (competitorNames.includes(brandLower) && brandLower !== trackedBrand) {
            competitorsMentioned.add(brand)
          }
        })
      })

      // Calculate priority based on gap analysis
      let priority: 'high' | 'medium' | 'low' = 'low'
      if (!mentionsBrand && competitorsMentioned.size > 0) {
        priority = competitorsMentioned.size >= 2 ? 'high' : 'medium'
      } else if (!mentionsBrand && totalResponses > 0) {
        priority = 'medium'
      }

      return {
        promptId: prompt.id,
        promptText: prompt.prompt_text,
        intentType: prompt.intent_type,
        monitorName: prompt.monitor?.name || 'Unknown',
        mentionsBrand,
        competitorsMentioned: Array.from(competitorsMentioned),
        competitorCount: competitorsMentioned.size,
        totalResponses,
        visibilityPct: prompt.visibility_pct || 0,
        priority,
      }
    }).filter(gap =>
      // Only show actual gaps (not mentioned or competitors are mentioned)
      !gap.mentionsBrand || gap.competitorCount > 0
    )
  }, [prompts, trackedBrand, competitorNames])

  // Filter and sort gaps
  const filteredGaps = useMemo(() => {
    let filtered = gapAnalysis

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(gap =>
        gap.promptText.toLowerCase().includes(query) ||
        gap.competitorsMentioned.some(c => c.toLowerCase().includes(query))
      )
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(gap => gap.priority === priorityFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'prompt_text':
          comparison = a.promptText.localeCompare(b.promptText)
          break
        case 'competitor_count':
          comparison = a.competitorCount - b.competitorCount
          break
        case 'visibility_pct':
          comparison = a.visibilityPct - b.visibilityPct
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [gapAnalysis, searchQuery, priorityFilter, sortField, sortDirection])

  // Stats
  const stats = useMemo(() => {
    const highPriority = gapAnalysis.filter(g => g.priority === 'high').length
    const mediumPriority = gapAnalysis.filter(g => g.priority === 'medium').length
    const lowPriority = gapAnalysis.filter(g => g.priority === 'low').length
    const totalGaps = gapAnalysis.length

    return { highPriority, mediumPriority, lowPriority, totalGaps }
  }, [gapAnalysis])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Answer Gap Analysis</h1>
          <p className="text-muted-foreground">
            Identify opportunities where competitors appear but your brand doesn&apos;t
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Answer Gap Analysis</h1>
        <p className="text-muted-foreground">
          Identify opportunities where competitors appear but your brand doesn&apos;t
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gaps
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGaps}</div>
            <p className="text-xs text-muted-foreground">
              Content opportunities identified
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              High Priority
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              Multiple competitors mentioned
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Medium Priority
            </CardTitle>
            <Lightbulb className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumPriority}</div>
            <p className="text-xs text-muted-foreground">
              Single competitor or no brand mention
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Low Priority
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.lowPriority}</div>
            <p className="text-xs text-muted-foreground">
              Minor optimization opportunities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How Gap Analysis Works</p>
              <p className="text-sm text-blue-700 mt-1">
                We analyze all AI responses to your prompts and identify cases where competitors
                are mentioned but your brand isn&apos;t. High priority gaps have multiple competitors
                mentioned, indicating strong market presence you&apos;re missing out on.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts or competitors..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gaps Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Opportunities</CardTitle>
          <CardDescription>
            Prompts where your brand could gain visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGaps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No content gaps found</p>
              <p className="text-sm mt-1">
                {gapAnalysis.length === 0
                  ? 'Collect AI responses to identify gaps'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort('priority')}
                    >
                      Priority
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort('prompt_text')}
                    >
                      Prompt
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => handleSort('competitor_count')}
                    >
                      Competitors
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Your Brand</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                      onClick={() => handleSort('visibility_pct')}
                    >
                      Visibility
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGaps.map((gap) => (
                  <TableRow key={gap.promptId} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Badge className={getPriorityColor(gap.priority)} variant="outline">
                        {gap.priority.charAt(0).toUpperCase() + gap.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="line-clamp-2 font-medium">{gap.promptText}</span>
                        <span className="text-xs text-muted-foreground">{gap.monitorName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gap.intentType === 'commercial' ? 'default' : 'secondary'}>
                        {gap.intentType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gap.competitorCount > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {gap.competitorsMentioned.slice(0, 2).map(comp => (
                            <Badge key={comp} variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {comp}
                            </Badge>
                          ))}
                          {gap.competitorsMentioned.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{gap.competitorsMentioned.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None detected</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gap.mentionsBrand ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Mentioned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          Not mentioned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {gap.visibilityPct > 0 ? (
                        <span className={gap.visibilityPct >= 50 ? 'text-green-600' : 'text-muted-foreground'}>
                          {gap.visibilityPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
