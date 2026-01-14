'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  Copy,
  BarChart3,
  Target,
  Lightbulb,
  ListChecks,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import {
  useOptimizationTasks,
  useAnalyzeContent,
  useGenerateOptimizedContent,
  useStreamingContentPipeline,
  type ContentAnalysis,
  type OptimizationRecommendation,
  type PipelineStreamEvent,
  type PipelineResult,
} from '@/hooks/useContent'
import { useKeywords } from '@/hooks/useKeywords'
import { cn } from '@/lib/utils'

function ScoreCard({
  title,
  score,
  icon: Icon,
  description,
}: {
  title: string
  score: number
  icon: React.ElementType
  description: string
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <span className={cn('text-3xl font-bold', getScoreColor(score))}>
            {score}
          </span>
          <div className="flex-1">
            <Progress value={score} className={cn('h-2', getProgressColor(score))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  )
}

function RecommendationCard({ recommendation }: { recommendation: OptimizationRecommendation }) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
      default:
        return <Badge variant="outline">Low</Badge>
    }
  }

  return (
    <AccordionItem value={recommendation.title} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3">
          {getPriorityIcon(recommendation.priority)}
          <span className="font-medium">{recommendation.title}</span>
          {getPriorityBadge(recommendation.priority)}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pt-2">
        <p className="text-muted-foreground">{recommendation.description}</p>
        {recommendation.currentState && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-800">Current Issue:</p>
            <p className="text-sm text-red-700">{recommendation.currentState}</p>
          </div>
        )}
        {recommendation.suggestedFix && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-800">Suggested Fix:</p>
            <p className="text-sm text-green-700">{recommendation.suggestedFix}</p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function AnalyzeTab({ projectId }: { projectId: string }) {
  const [targetKeyword, setTargetKeyword] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [pageContent, setPageContent] = useState('')
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)

  const analyzeContent = useAnalyzeContent()
  const { data: keywords } = useKeywords(projectId)
  const topKeywords = keywords?.slice(0, 10) || []

  const handleAnalyze = async () => {
    if (!targetKeyword.trim()) return

    const result = await analyzeContent.mutateAsync({
      projectId,
      targetUrl,
      targetKeyword: targetKeyword.trim(),
      pageContent,
    })

    setAnalysis(result.analysis)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Analyze Content
          </CardTitle>
          <CardDescription>
            Enter your target keyword and content to receive AI-powered optimization recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Keyword</label>
              <Input
                placeholder="Enter target keyword..."
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
              />
              {topKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {topKeywords.map((kw) => (
                    <Button
                      key={kw.id}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setTargetKeyword(kw.keyword)}
                    >
                      {kw.keyword}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target URL (optional)</label>
              <Input
                placeholder="https://example.com/page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Page Content</label>
            <Textarea
              placeholder="Paste your page content here for analysis..."
              value={pageContent}
              onChange={(e) => setPageContent(e.target.value)}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              {pageContent.split(/\s+/).filter(w => w).length} words
            </p>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeContent.isPending || !targetKeyword.trim()}
            className="w-full"
          >
            {analyzeContent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing Content...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Analyze & Optimize
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysis && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ScoreCard
              title="SEO Score"
              score={analysis.seoScore}
              icon={BarChart3}
              description="Overall optimization level"
            />
            <ScoreCard
              title="Readability"
              score={analysis.readabilityScore}
              icon={BookOpen}
              description="Content clarity score"
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Keyword Density
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analysis.keywordDensity.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">Target: 1-2%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Word Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analysis.wordCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Target: 1500-2500</p>
              </CardContent>
            </Card>
          </div>

          {/* Optimized Meta */}
          {(analysis.optimizedTitle || analysis.optimizedMetaDescription) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Optimized Meta Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.optimizedTitle && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Title Tag</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(analysis.optimizedTitle!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{analysis.optimizedTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analysis.optimizedTitle.length} characters
                      </p>
                    </div>
                  </div>
                )}
                {analysis.optimizedMetaDescription && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Meta Description</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(analysis.optimizedMetaDescription!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{analysis.optimizedMetaDescription}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analysis.optimizedMetaDescription.length} characters
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Optimization Recommendations
                </CardTitle>
                <CardDescription>
                  {analysis.recommendations.length} recommendations to improve your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <RecommendationCard key={idx} recommendation={rec} />
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Suggested Keywords & Headings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.suggestedHeadings && analysis.suggestedHeadings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Suggested Headings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.suggestedHeadings.map((heading, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {heading}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {analysis.suggestedKeywords && analysis.suggestedKeywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Keywords to Include</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedKeywords.map((kw, idx) => (
                      <Badge key={idx} variant="secondary">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'brand-analyzer', label: 'Brand Analyzer', description: 'Extracting brand DNA' },
  { id: 'content-planner', label: 'Content Planner', description: 'Creating content plan' },
  { id: 'writer', label: 'Writer', description: 'Writing content' },
  { id: 'editor', label: 'Editor', description: 'Polishing content' },
  { id: 'schema-generator', label: 'Schema Generator', description: 'Creating JSON-LD' },
  { id: 'output-generator', label: 'Output Generator', description: 'Generating outputs' },
]

function PipelineStageIndicator({
  stage,
  currentStage,
  status,
}: {
  stage: { id: string; label: string; description: string }
  currentStage: string | null
  status: 'pending' | 'running' | 'completed' | 'error'
}) {
  const isActive = currentStage === stage.id
  const isPending = status === 'pending'
  const isCompleted = status === 'completed'
  const isError = status === 'error'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        isActive && 'border-primary bg-primary/5',
        isCompleted && 'border-green-500 bg-green-50',
        isError && 'border-red-500 bg-red-50',
        isPending && 'border-muted'
      )}
    >
      <div className="flex-shrink-0">
        {isActive && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {isError && <AlertCircle className="h-5 w-5 text-red-500" />}
        {isPending && <div className="h-5 w-5 rounded-full border-2 border-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', isPending && 'text-muted-foreground')}>
          {stage.label}
        </p>
        <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
      </div>
    </div>
  )
}

function GenerateTab({ projectId }: { projectId: string }) {
  const [topic, setTopic] = useState('')
  const [targetKeyword, setTargetKeyword] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [targetWordCount, setTargetWordCount] = useState(1500)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [stageStatus, setStageStatus] = useState<Record<string, 'pending' | 'running' | 'completed' | 'error'>>({})
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PipelineResult | null>(null)

  const streamingPipeline = useStreamingContentPipeline()
  const { data: keywords } = useKeywords(projectId)
  const topKeywords = keywords?.slice(0, 10) || []

  const handleGenerate = async () => {
    if (!topic.trim() || !targetKeyword.trim()) return

    setIsRunning(true)
    setError(null)
    setResult(null)
    setProgress(0)
    setCurrentStage(null)
    setStatusMessage('Starting pipeline...')
    setStageStatus({})

    try {
      const finalResult = await streamingPipeline.run(
        {
          projectId,
          topic: topic.trim(),
          targetKeyword: targetKeyword.trim(),
          targetWordCount,
          additionalNotes: additionalNotes.trim() || undefined,
          contentType: 'article',
        },
        (event: PipelineStreamEvent) => {
          setStatusMessage(event.message)
          if (event.progress !== undefined) {
            setProgress(event.progress)
          }
          if (event.stage) {
            setCurrentStage(event.stage)
            if (event.type === 'progress') {
              setStageStatus((prev) => ({ ...prev, [event.stage!]: 'running' }))
            } else if (event.type === 'stage-complete') {
              setStageStatus((prev) => ({ ...prev, [event.stage!]: 'completed' }))
            }
          }
          if (event.type === 'error') {
            setError(event.message)
          }
        }
      )

      if (finalResult) {
        setResult(finalResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed')
    } finally {
      setIsRunning(false)
      setCurrentStage(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const copyAllContent = () => {
    if (result?.result.markdown) {
      navigator.clipboard.writeText(result.result.markdown)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            6-Agent Content Pipeline
          </CardTitle>
          <CardDescription>
            Generate publication-ready SEO content using our AI agent pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic / Title</label>
              <Input
                placeholder="Enter your content topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Keyword</label>
              <Input
                placeholder="Primary keyword to target..."
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                disabled={isRunning}
              />
              {topKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topKeywords.map((kw) => (
                    <Button
                      key={kw.id}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setTargetKeyword(kw.keyword)}
                      disabled={isRunning}
                    >
                      {kw.keyword}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Word Count</label>
              <Input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 1500)}
                min={500}
                max={5000}
                step={100}
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes (optional)</label>
              <Input
                placeholder="Special instructions or topics to cover..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                disabled={isRunning}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isRunning || !topic.trim() || !targetKeyword.trim()}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pipeline Progress
            </CardTitle>
            <CardDescription>{statusMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineStageIndicator
                  key={stage.id}
                  stage={stage}
                  currentStage={currentStage}
                  status={stageStatus[stage.id] || 'pending'}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && !isRunning && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Pipeline Error</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Content Generated
                </CardTitle>
                <CardDescription>
                  {result.result.wordCount} words | SEO Score: {result.result.seoScore}/100 |
                  Readability: {result.result.readabilityScore}/100
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={copyAllContent}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Markdown
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meta Info */}
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Meta Title</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.result.metaTitle || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-medium">{result.result.metaTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.result.metaTitle?.length} characters
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Meta Description</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.result.metaDescription || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm">{result.result.metaDescription}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.result.metaDescription?.length} characters
                </p>
              </div>
            </div>

            {/* Content Preview */}
            {result.result.markdown && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Content Preview</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.result.markdown || '')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {result.result.markdown.substring(0, 2000)}
                    {result.result.markdown.length > 2000 && '\n\n... (content truncated)'}
                  </pre>
                </div>
              </div>
            )}

            {/* FAQs */}
            {result.result.faqs && result.result.faqs.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">FAQs ({result.result.faqs.length})</h3>
                <div className="space-y-3">
                  {result.result.faqs.map((faq, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{faq.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schema */}
            {result.result.schema && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">JSON-LD Schema</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.result.schema || '')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 border rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {result.result.schema.substring(0, 1000)}
                    {result.result.schema.length > 1000 && '\n... (truncated)'}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TasksTab({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useOptimizationTasks(projectId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'analyzing':
        return <Badge className="bg-blue-500">Analyzing</Badge>
      case 'optimized':
        return <Badge className="bg-green-500">Optimized</Badge>
      case 'published':
        return <Badge className="bg-purple-500">Published</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Optimization Tasks
        </CardTitle>
        <CardDescription>
          Track your content optimization progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No optimization tasks yet.</p>
            <p className="text-sm">Analyze content to create your first task.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.target_keyword}</span>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.target_url && (
                    <p className="text-sm text-muted-foreground">{task.target_url}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(task.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.ai_analysis && (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Score: {task.ai_analysis.seoScore}/100
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.recommendations?.length || 0} recommendations
                      </p>
                    </div>
                  )}
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ContentOptimizerPage() {
  const params = useParams()
  const brandId = params.brandId as string

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wand2 className="h-8 w-8 text-primary" />
          Content Optimizer
        </h1>
        <p className="text-muted-foreground">
          AI-powered content optimization for maximum SEO impact
        </p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <AnalyzeTab projectId={brandId} />
        </TabsContent>

        <TabsContent value="generate">
          <GenerateTab projectId={brandId} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab projectId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
