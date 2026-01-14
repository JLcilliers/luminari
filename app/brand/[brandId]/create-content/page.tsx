'use client'

import { useState, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Target, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { ContentGenerator } from '@/components/content/ContentGenerator'
import { usePrompts, useResponses, useCompetitors, useProject, type PromptWithResponses } from '@/hooks'

interface GapAnalysis {
  promptId: string
  promptText: string
  intentType: 'organic' | 'commercial'
  mentionsBrand: boolean
  competitorsMentioned: string[]
  competitorCount: number
  totalResponses: number
  visibilityPct: number
  priority: 'high' | 'medium' | 'low'
}

function getPriorityBadgeVariant(priority: string): 'default' | 'secondary' | 'destructive' {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'default'
    default:
      return 'secondary'
  }
}

export default function CreateContentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CreateContentPageContent />
    </Suspense>
  )
}

function CreateContentPageContent() {
  const params = useParams()
  const brandId = params.brandId as string
  const router = useRouter()
  const searchParams = useSearchParams()

  const { data: prompts, isLoading: promptsLoading } = usePrompts(brandId)
  const { data: responses } = useResponses(brandId)
  const { data: competitors } = useCompetitors(brandId)
  const { data: project } = useProject(brandId)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<GapAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<'gaps' | 'custom'>('gaps')

  const brandName = project?.tracked_brand || ''
  const competitorNames = competitors?.map(c => c.name.toLowerCase()) || []

  // Calculate answer gaps
  const answerGaps = useMemo((): GapAnalysis[] => {
    if (!prompts || !responses) return []

    return prompts.map((prompt: PromptWithResponses) => {
      // Get responses for this prompt
      const promptResponses = responses.filter(r => r.prompt_id === prompt.id)

      // Check if brand is mentioned in any response
      const mentionsBrand = promptResponses.some(r => r.mentions_brand)

      // Find which competitors are mentioned
      const competitorsMentioned = new Set<string>()
      promptResponses.forEach(r => {
        if (r.brands_mentioned) {
          r.brands_mentioned.forEach(brand => {
            if (competitorNames.includes(brand.toLowerCase())) {
              competitorsMentioned.add(brand)
            }
          })
        }
      })

      // Calculate priority
      let priority: 'high' | 'medium' | 'low' = 'low'
      if (!mentionsBrand && competitorsMentioned.size >= 2) {
        priority = 'high'
      } else if (!mentionsBrand && competitorsMentioned.size >= 1) {
        priority = 'medium'
      } else if (!mentionsBrand) {
        priority = 'low'
      }

      return {
        promptId: prompt.id,
        promptText: prompt.prompt_text,
        intentType: prompt.intent_type,
        mentionsBrand,
        competitorsMentioned: Array.from(competitorsMentioned),
        competitorCount: competitorsMentioned.size,
        totalResponses: promptResponses.length,
        visibilityPct: prompt.visibility_pct || 0,
        priority,
      }
    })
    // Filter to only show gaps (where brand is not mentioned) and sort by priority
    .filter(gap => !gap.mentionsBrand && gap.totalResponses > 0)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [prompts, responses, competitorNames])

  // Filter gaps based on search
  const filteredGaps = useMemo(() => {
    if (!searchQuery) return answerGaps
    const query = searchQuery.toLowerCase()
    return answerGaps.filter(gap =>
      gap.promptText.toLowerCase().includes(query) ||
      gap.competitorsMentioned.some(c => c.toLowerCase().includes(query))
    )
  }, [answerGaps, searchQuery])

  const handleSelectGap = (gap: GapAnalysis) => {
    setSelectedPrompt(gap)
  }

  const handleContentGenerated = () => {
    // Redirect to content library after generation
    router.push(`/brand/${brandId}/content-library`)
  }

  // Check if coming from answer-gaps page with a pre-selected prompt
  const preSelectedPromptId = searchParams.get('promptId')
  const preSelectedPrompt = useMemo(() => {
    if (!preSelectedPromptId || !answerGaps.length) return null
    return answerGaps.find(g => g.promptId === preSelectedPromptId) || null
  }, [preSelectedPromptId, answerGaps])

  // Auto-select pre-selected prompt
  if (preSelectedPrompt && !selectedPrompt) {
    setSelectedPrompt(preSelectedPrompt)
  }

  const isLoading = promptsLoading

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Content</h1>
        <p className="text-muted-foreground">
          Generate AI-optimized content to fill your visibility gaps
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Gap Selection */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'gaps' | 'custom')}>
            <TabsList className="w-full">
              <TabsTrigger value="gaps" className="flex-1 gap-2">
                <Target className="h-4 w-4" />
                From Answer Gaps
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 gap-2">
                <Sparkles className="h-4 w-4" />
                Custom Topic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gaps" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Select an Answer Gap</CardTitle>
                  <CardDescription>
                    These are queries where competitors appear but {brandName || 'your brand'} doesn't
                  </CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search gaps..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredGaps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No answer gaps found</p>
                      <p className="text-sm">
                        {answerGaps.length === 0
                          ? 'Collect more AI responses to identify gaps'
                          : 'Try adjusting your search'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Query</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Competitors</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredGaps.slice(0, 10).map((gap) => (
                            <TableRow
                              key={gap.promptId}
                              className={`cursor-pointer ${
                                selectedPrompt?.promptId === gap.promptId
                                  ? 'bg-primary/5'
                                  : ''
                              }`}
                              onClick={() => handleSelectGap(gap)}
                            >
                              <TableCell className="max-w-[200px]">
                                <span className="line-clamp-2 text-sm">
                                  {gap.promptText}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityBadgeVariant(gap.priority)}>
                                  {gap.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {gap.competitorCount > 0
                                    ? gap.competitorsMentioned.slice(0, 2).join(', ')
                                    : 'None'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelectGap(gap)
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Custom Topic</CardTitle>
                  <CardDescription>
                    Generate content for any topic, not just answer gaps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the content generator on the right to create content for any topic.
                    Simply enter your topic and configure the generation settings.
                  </p>
                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-medium mb-2">Tips for effective content:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Be specific about your topic or question</li>
                      <li>• Include relevant keywords for SEO</li>
                      <li>• Choose the content type that best fits your needs</li>
                      <li>• Consider including competitor comparison for differentiation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Selected Gap Info */}
          {selectedPrompt && activeTab === 'gaps' && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Selected Gap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">{selectedPrompt.promptText}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getPriorityBadgeVariant(selectedPrompt.priority)}>
                    {selectedPrompt.priority} priority
                  </Badge>
                  <Badge variant="outline">
                    {selectedPrompt.intentType}
                  </Badge>
                  {selectedPrompt.competitorsMentioned.map(comp => (
                    <Badge key={comp} variant="secondary">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Content Generator */}
        <div>
          <ContentGenerator
            initialPrompt={selectedPrompt?.promptText || ''}
            promptId={selectedPrompt?.promptId}
            onSuccess={handleContentGenerated}
          />
        </div>
      </div>
    </div>
  )
}
