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
  type ContentAnalysis,
  type OptimizationRecommendation,
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

function GenerateTab({ projectId }: { projectId: string }) {
  const [targetKeyword, setTargetKeyword] = useState('')
  const [generatedContent, setGeneratedContent] = useState<{
    title: string
    metaDescription: string
    outline: string[]
    introduction: string
    sections: { heading: string; content: string }[]
  } | null>(null)

  const generateContent = useGenerateOptimizedContent()
  const { data: keywords } = useKeywords(projectId)
  const topKeywords = keywords?.slice(0, 10) || []

  const handleGenerate = async () => {
    if (!targetKeyword.trim()) return

    const result = await generateContent.mutateAsync({
      projectId,
      targetKeyword: targetKeyword.trim(),
    })

    setGeneratedContent(result.content)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const copyAllContent = () => {
    if (!generatedContent) return

    const fullContent = `# ${generatedContent.title}

${generatedContent.introduction}

${generatedContent.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}`

    navigator.clipboard.writeText(fullContent)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Optimized Content
          </CardTitle>
          <CardDescription>
            Generate SEO-optimized content structure for any keyword
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <Button
            onClick={handleGenerate}
            disabled={generateContent.isPending || !targetKeyword.trim()}
            className="w-full"
          >
            {generateContent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Content...
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

      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Content</CardTitle>
              <Button variant="outline" size="sm" onClick={copyAllContent}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title & Meta */}
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Title Tag</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.title)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <h1 className="text-xl font-bold">{generatedContent.title}</h1>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Meta Description</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.metaDescription)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm">{generatedContent.metaDescription}</p>
              </div>
            </div>

            {/* Outline */}
            {generatedContent.outline && generatedContent.outline.length > 0 && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-3">Content Outline</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {generatedContent.outline.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Introduction */}
            {generatedContent.introduction && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Introduction</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.introduction)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {generatedContent.introduction}
                </p>
              </div>
            )}

            {/* Sections */}
            {generatedContent.sections && generatedContent.sections.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Content Sections</h3>
                {generatedContent.sections.map((section, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-primary">{section.heading}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`## ${section.heading}\n\n${section.content}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
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
