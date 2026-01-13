'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Pickaxe,
  Lightbulb,
  Target,
  Plus,
  Search,
  Loader2,
  Globe,
  Trash2,
  Fuel,
} from 'lucide-react'
import { KeywordTable, KeywordCart } from '@/components/keywords'
import {
  useKeywords,
  useProjects,
  useAddKeyword,
  useAnalyzeKeywords,
  useCompetitorDomains,
  useAddCompetitorDomain,
  useDeleteCompetitorDomain,
} from '@/hooks'
import type { KeywordSource } from '@/lib/types'

function MineTab({ projectId }: { projectId: string }) {
  const { data: keywords, isLoading } = useKeywords(projectId, 'mine')
  const [newKeyword, setNewKeyword] = useState('')
  const addKeyword = useAddKeyword()

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return
    await addKeyword.mutateAsync({
      projectId,
      keyword: newKeyword.trim(),
      source: 'mine',
    })
    setNewKeyword('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5" />
            Keywords You Already Rank For
          </CardTitle>
          <CardDescription>
            Add keywords your brand currently ranks for. Track your existing positions and identify
            opportunities to improve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Input
              placeholder="Enter a keyword you rank for..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <Button onClick={handleAddKeyword} disabled={addKeyword.isPending}>
              {addKeyword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">Add</span>
            </Button>
          </div>

          <KeywordTable
            keywords={keywords || []}
            projectId={projectId}
            isLoading={isLoading}
            emptyMessage="No mined keywords yet. Add keywords you currently rank for above."
          />
        </CardContent>
      </Card>
    </div>
  )
}

function PlanTab({ projectId }: { projectId: string }) {
  const { data: keywords, isLoading } = useKeywords(projectId, 'plan')
  const [seedKeywords, setSeedKeywords] = useState('')
  const analyzeKeywords = useAnalyzeKeywords()

  const handleAnalyze = async () => {
    const seeds = seedKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k)
    if (seeds.length === 0) return

    await analyzeKeywords.mutateAsync({
      projectId,
      type: 'plan',
      seedKeywords: seeds,
    })
    setSeedKeywords('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Discover Related Keywords
          </CardTitle>
          <CardDescription>
            Enter seed keywords to discover related terms, questions, and long-tail variations that
            could boost your AI visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Input
              placeholder="Enter seed keywords (comma separated)..."
              value={seedKeywords}
              onChange={(e) => setSeedKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={analyzeKeywords.isPending}>
              {analyzeKeywords.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Discover Keywords
            </Button>
          </div>

          {analyzeKeywords.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Analyzing keywords with AI...</p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          )}

          {!analyzeKeywords.isPending && (
            <KeywordTable
              keywords={keywords || []}
              projectId={projectId}
              isLoading={isLoading}
              emptyMessage="No planned keywords yet. Enter seed keywords above to discover opportunities."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CompeteTab({ projectId }: { projectId: string }) {
  const { data: keywords, isLoading } = useKeywords(projectId, 'compete')
  const { data: domains } = useCompetitorDomains(projectId)
  const [newDomain, setNewDomain] = useState('')
  const addDomain = useAddCompetitorDomain()
  const deleteDomain = useDeleteCompetitorDomain()
  const analyzeKeywords = useAnalyzeKeywords()

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    await addDomain.mutateAsync({
      projectId,
      domain: newDomain.trim(),
    })
    setNewDomain('')
  }

  const handleAnalyzeDomain = async (domain: string) => {
    await analyzeKeywords.mutateAsync({
      projectId,
      type: 'compete',
      competitorDomain: domain,
    })
  }

  const handleDeleteDomain = async (domainId: string) => {
    if (confirm('Remove this competitor domain?')) {
      await deleteDomain.mutateAsync({ projectId, domainId })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitor Analysis
          </CardTitle>
          <CardDescription>
            Add competitor domains to analyze their keyword strategy and find gaps where you can
            outrank them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Input
              placeholder="Enter competitor domain (e.g., competitor.com)..."
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              className="flex-1"
            />
            <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
              {addDomain.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span className="ml-2">Add Domain</span>
            </Button>
          </div>

          {/* Competitor Domains List */}
          {domains && domains.length > 0 && (
            <div className="mb-6 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Tracked Competitors</h4>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{domain.domain}</span>
                    <Badge variant="secondary" className="text-xs">
                      {domain.keywords_found} keywords
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAnalyzeDomain(domain.domain)}
                      disabled={analyzeKeywords.isPending}
                    >
                      <Search className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDomain(domain.id)}
                      disabled={deleteDomain.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyzeKeywords.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Analyzing competitor keywords...</p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          )}

          {!analyzeKeywords.isPending && (
            <KeywordTable
              keywords={keywords || []}
              projectId={projectId}
              isLoading={isLoading}
              showCompetitor
              emptyMessage="No competitor keywords yet. Add a competitor domain and click analyze."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function KeywordFuelerPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const projectId = projects?.[0]?.id

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Fueler</h1>
          <p className="text-muted-foreground">
            No project found. Please create a project first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Fuel className="h-8 w-8 text-primary" />
            Keyword Fueler
          </h1>
          <p className="text-muted-foreground">
            Discover, plan, and compete for keywords to fuel your AI visibility strategy
          </p>
        </div>
        <KeywordCart projectId={projectId} />
      </div>

      <Tabs defaultValue="mine" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <Pickaxe className="h-4 w-4" />
            Mine
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="compete" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Compete
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <MineTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="plan">
          <PlanTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="compete">
          <CompeteTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
