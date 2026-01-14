'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  RefreshCw,
  Target,
  Loader2,
  Database,
  Globe,
  BarChart3,
  ArrowUpDown,
  ExternalLink,
  FileText,
  Sparkles,
  Plus,
  Send,
  Zap,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import {
  useKeywords,
  useSyncKeywords,
  useKeywordResearch,
  useAddToCart,
  useCompetitors,
  useProject,
} from '@/hooks'
import { cn } from '@/lib/utils'
import type { Keyword } from '@/lib/types'

interface DiscoveredKeyword {
  keyword: string
  intent: string
  competition: string
  businessValue: string
  reasoning: string
  selected?: boolean
}

interface DomainKeyword {
  keyword: string
  searchVolume: number
  position: number | null
  url: string | null
  difficulty: number | null
  cpc: number | null
  intent: string | null
  selected?: boolean
}

interface KeywordData {
  keyword: string
  search_volume?: number
  cpc?: number
  competition?: number
  difficulty?: number
  position?: number
  url?: string
}

// Stats Component
function KeywordStats({ keywords }: { keywords: Keyword[] }) {
  const withVolume = keywords.filter(k => k.search_volume).length
  const ranking = keywords.filter(k => k.position).length
  const highIntent = keywords.filter(k => k.intent_type === 'commercial' || k.intent_type === 'transactional').length

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Target className="h-4 w-4" />
            Total Keywords
          </div>
          <div className="text-2xl font-bold mt-1">{keywords.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            With Volume Data
          </div>
          <div className="text-2xl font-bold mt-1">{withVolume}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <BarChart3 className="h-4 w-4" />
            Currently Ranking
          </div>
          <div className="text-2xl font-bold mt-1">{ranking}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Zap className="h-4 w-4" />
            High Intent
          </div>
          <div className="text-2xl font-bold mt-1">{highIntent}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// Keyword Source Buttons
function KeywordSourceButtons({
  onImportBrandBible,
  onScanDomain,
  onAIDiscovery,
  onManualEntry,
  importingBrandBible,
  scanningDomain,
  discoveringKeywords,
}: {
  onImportBrandBible: () => void
  onScanDomain: () => void
  onAIDiscovery: () => void
  onManualEntry: () => void
  importingBrandBible: boolean
  scanningDomain: boolean
  discoveringKeywords: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <button
        onClick={onImportBrandBible}
        disabled={importingBrandBible}
        className="flex flex-col items-center gap-3 p-6 bg-background border-2 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50"
      >
        <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200">
          {importingBrandBible ? (
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          ) : (
            <FileText className="h-6 w-6 text-blue-600" />
          )}
        </div>
        <div className="text-center">
          <div className="font-medium">Brand Bible</div>
          <div className="text-sm text-muted-foreground">Import from crawl</div>
        </div>
      </button>

      <button
        onClick={onScanDomain}
        disabled={scanningDomain}
        className="flex flex-col items-center gap-3 p-6 bg-background border-2 border-dashed rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group disabled:opacity-50"
      >
        <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200">
          {scanningDomain ? (
            <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
          ) : (
            <Globe className="h-6 w-6 text-green-600" />
          )}
        </div>
        <div className="text-center">
          <div className="font-medium">Scan Domain</div>
          <div className="text-sm text-muted-foreground">Find ranking keywords</div>
        </div>
      </button>

      <button
        onClick={onAIDiscovery}
        disabled={discoveringKeywords}
        className="flex flex-col items-center gap-3 p-6 bg-background border-2 border-dashed rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group disabled:opacity-50"
      >
        <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200">
          {discoveringKeywords ? (
            <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6 text-purple-600" />
          )}
        </div>
        <div className="text-center">
          <div className="font-medium">AI Discovery</div>
          <div className="text-sm text-muted-foreground">Generate ideas</div>
        </div>
      </button>

      <button
        onClick={onManualEntry}
        className="flex flex-col items-center gap-3 p-6 bg-background border-2 border-dashed rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
      >
        <div className="p-3 bg-orange-100 rounded-full group-hover:bg-orange-200">
          <Plus className="h-6 w-6 text-orange-600" />
        </div>
        <div className="text-center">
          <div className="font-medium">Add Manual</div>
          <div className="text-sm text-muted-foreground">Enter keywords</div>
        </div>
      </button>
    </div>
  )
}

// Overview Tab - Your Keywords
function OverviewTab({
  projectId,
  keywords,
  isLoading,
  selectedKeywords,
  onToggleSelection,
  onSelectAll,
  onRefresh,
  isRefreshing,
}: {
  projectId: string
  keywords: Keyword[]
  isLoading: boolean
  selectedKeywords: Set<string>
  onToggleSelection: (id: string) => void
  onSelectAll: (selectAll: boolean) => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const addToCart = useAddToCart()
  const [sortBy, setSortBy] = useState<'search_volume' | 'position' | 'keyword_difficulty'>('search_volume')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedKeywords = [...keywords].sort((a, b) => {
    const aVal = (sortBy === 'search_volume' ? a.search_volume : sortBy === 'position' ? a.position : a.keyword_difficulty) ?? (sortDir === 'desc' ? -Infinity : Infinity)
    const bVal = (sortBy === 'search_volume' ? b.search_volume : sortBy === 'position' ? b.position : b.keyword_difficulty) ?? (sortDir === 'desc' ? -Infinity : Infinity)
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const getDifficultyColor = (difficulty: number | null | undefined) => {
    if (!difficulty) return 'text-muted-foreground'
    if (difficulty < 30) return 'text-green-500'
    if (difficulty < 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getPositionBadge = (position: number | null | undefined) => {
    if (!position) return null
    if (position <= 3) return <Badge className="bg-green-500">Top 3</Badge>
    if (position <= 10) return <Badge className="bg-blue-500">Page 1</Badge>
    if (position <= 20) return <Badge variant="secondary">Page 2</Badge>
    return <Badge variant="outline">Page {Math.ceil(position / 10)}</Badge>
  }

  const getIntentBadge = (intent: string | null | undefined) => {
    if (!intent) return null
    const colors: Record<string, string> = {
      informational: 'bg-blue-100 text-blue-700',
      commercial: 'bg-purple-100 text-purple-700',
      transactional: 'bg-green-100 text-green-700',
      navigational: 'bg-gray-100 text-gray-700',
    }
    return (
      <Badge variant="outline" className={colors[intent.toLowerCase()] || ''}>
        {intent}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (keywords.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Keywords Yet</h3>
            <p className="text-muted-foreground mb-6">
              Use the buttons above to import or discover keywords
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Your Keywords ({keywords.length})
            </CardTitle>
            <CardDescription>
              Keywords from all sources enriched with DataForSEO metrics
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedKeywords.size === keywords.length && keywords.length > 0}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="w-[300px]">Keyword</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort('search_volume')}
                >
                  <div className="flex items-center gap-1">
                    Volume
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort('position')}
                >
                  <div className="flex items-center gap-1">
                    Position
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort('keyword_difficulty')}
                >
                  <div className="flex items-center gap-1">
                    Difficulty
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedKeywords.slice(0, 100).map((kw) => (
                <TableRow key={kw.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedKeywords.has(kw.id)}
                      onCheckedChange={() => onToggleSelection(kw.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{kw.keyword}</span>
                      {kw.landing_page && (
                        <a
                          href={kw.landing_page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {(() => {
                            try { return new URL(kw.landing_page).pathname }
                            catch { return kw.landing_page }
                          })()}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {kw.search_volume?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {kw.position || '-'}
                      {getPositionBadge(kw.position)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={getDifficultyColor(kw.keyword_difficulty)}>
                      {kw.keyword_difficulty || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getIntentBadge(kw.intent_type)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {kw.source || 'manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addToCart.mutate({ projectId, keywordId: kw.id })}
                      disabled={kw.in_cart || addToCart.isPending}
                    >
                      {kw.in_cart ? 'In Cart' : 'Add'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {keywords.length > 100 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing 100 of {keywords.length} keywords
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Domain Scan Results Tab
function DomainScanTab({
  domainKeywords,
  onSave,
  onToggleSelection,
  onSelectAll,
  saving,
}: {
  domainKeywords: DomainKeyword[]
  onSave: () => void
  onToggleSelection: (index: number) => void
  onSelectAll: (selectAll: boolean) => void
  saving: boolean
}) {
  const selectedCount = domainKeywords.filter(k => k.selected).length

  const getDifficultyBadge = (difficulty: number | null) => {
    if (!difficulty) return null
    const color = difficulty < 30 ? 'bg-green-100 text-green-700' :
                  difficulty < 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
    return <Badge variant="outline" className={color}>{Math.round(difficulty)}</Badge>
  }

  if (domainKeywords.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Scan Your Domain</h3>
            <p className="text-muted-foreground">
              Click &quot;Scan Domain&quot; above to find keywords your website currently ranks for
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="bg-green-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-green-800">Domain Scan Results</CardTitle>
            <CardDescription className="text-green-700">
              Found {domainKeywords.length} keywords. Select keywords to add to your list.
            </CardDescription>
          </div>
          <Button
            onClick={onSave}
            disabled={selectedCount === 0 || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Selected ({selectedCount})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={domainKeywords.every(k => k.selected)}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Keyword</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domainKeywords.map((kw, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Checkbox
                    checked={kw.selected}
                    onCheckedChange={() => onToggleSelection(i)}
                  />
                </TableCell>
                <TableCell className="font-medium">{kw.keyword}</TableCell>
                <TableCell className="text-green-600 font-medium">
                  {kw.searchVolume?.toLocaleString()}
                </TableCell>
                <TableCell>{kw.position || '-'}</TableCell>
                <TableCell>{getDifficultyBadge(kw.difficulty)}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {kw.url?.replace(/https?:\/\/[^/]+/, '') || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// AI Discovery Results Tab
function AIDiscoveryTab({
  discoveredKeywords,
  onSave,
  onToggleSelection,
  onSelectAll,
  saving,
}: {
  discoveredKeywords: DiscoveredKeyword[]
  onSave: () => void
  onToggleSelection: (index: number) => void
  onSelectAll: (selectAll: boolean) => void
  saving: boolean
}) {
  const selectedCount = discoveredKeywords.filter(k => k.selected).length

  const getIntentBadge = (intent: string) => {
    const colors: Record<string, string> = {
      informational: 'bg-blue-100 text-blue-700',
      commercial: 'bg-purple-100 text-purple-700',
      transactional: 'bg-green-100 text-green-700',
      navigational: 'bg-gray-100 text-gray-700',
    }
    return <Badge variant="outline" className={colors[intent.toLowerCase()] || ''}>{intent}</Badge>
  }

  const getValueBadge = (value: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    }
    return <Badge variant="outline" className={colors[value.toLowerCase()] || ''}>{value} value</Badge>
  }

  const getCompetitionBadge = (competition: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    }
    return <Badge variant="outline" className={colors[competition.toLowerCase()] || ''}>{competition}</Badge>
  }

  if (discoveredKeywords.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">AI Keyword Discovery</h3>
            <p className="text-muted-foreground">
              Click &quot;AI Discovery&quot; above to generate keyword ideas based on your brand
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="bg-purple-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-800">AI Generated Keywords</CardTitle>
            <CardDescription className="text-purple-700">
              {discoveredKeywords.length} keyword ideas based on your brand. Select keywords to add.
            </CardDescription>
          </div>
          <Button
            onClick={onSave}
            disabled={selectedCount === 0 || saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Selected ({selectedCount})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        <div className="p-2 border-b bg-muted/30">
          <Checkbox
            id="select-all-ai"
            checked={discoveredKeywords.every(k => k.selected)}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
          />
          <label htmlFor="select-all-ai" className="ml-2 text-sm text-muted-foreground">
            Select all
          </label>
        </div>
        {discoveredKeywords.map((kw, i) => (
          <div key={i} className="p-4 hover:bg-muted/30">
            <div className="flex items-start gap-4">
              <Checkbox
                checked={kw.selected}
                onCheckedChange={() => onToggleSelection(i)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-medium">{kw.keyword}</span>
                  {getIntentBadge(kw.intent)}
                  {getValueBadge(kw.businessValue)}
                  {getCompetitionBadge(kw.competition)}
                </div>
                <p className="text-sm text-muted-foreground">{kw.reasoning}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Manual Entry Tab
function ManualEntryTab({
  projectId,
  onKeywordsAdded,
}: {
  projectId: string
  onKeywordsAdded: () => void
}) {
  const [manualKeyword, setManualKeyword] = useState('')
  const [bulkKeywords, setBulkKeywords] = useState('')
  const [adding, setAdding] = useState(false)

  const addSingleKeyword = async () => {
    if (!manualKeyword.trim()) return
    setAdding(true)
    try {
      const response = await fetch('/api/keywords/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          keywords: [{ keyword: manualKeyword.trim() }],
          source: 'manual',
        }),
      })
      if (response.ok) {
        setManualKeyword('')
        onKeywordsAdded()
      }
    } catch (error) {
      console.error('Add error:', error)
    }
    setAdding(false)
  }

  const addBulkKeywords = async () => {
    const keywordList = bulkKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    if (keywordList.length === 0) return
    setAdding(true)
    try {
      const response = await fetch('/api/keywords/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          keywords: keywordList.map(k => ({ keyword: k })),
          source: 'manual',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setBulkKeywords('')
        onKeywordsAdded()
        alert(`Added ${data.saved} keywords!`)
      }
    } catch (error) {
      console.error('Bulk add error:', error)
    }
    setAdding(false)
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Single Keyword</CardTitle>
          <CardDescription>Enter a keyword to add to your tracking list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={manualKeyword}
              onChange={(e) => setManualKeyword(e.target.value)}
              placeholder="Enter keyword..."
              onKeyPress={(e) => e.key === 'Enter' && addSingleKeyword()}
            />
            <Button onClick={addSingleKeyword} disabled={!manualKeyword.trim() || adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Multiple Keywords</CardTitle>
          <CardDescription>Enter keywords, one per line</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bulkKeywords}
            onChange={(e) => setBulkKeywords(e.target.value)}
            placeholder="Enter keywords, one per line..."
            rows={5}
            className="mb-3"
          />
          <Button
            onClick={addBulkKeywords}
            disabled={!bulkKeywords.trim() || adding}
            className="w-full"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add All Keywords
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Research Tab (existing functionality)
function ResearchTab({ projectId }: { projectId: string }) {
  const [seedKeyword, setSeedKeyword] = useState('')
  const [results, setResults] = useState<KeywordData[]>([])
  const keywordResearch = useKeywordResearch()

  const handleResearch = async (type: 'related' | 'serp') => {
    if (!seedKeyword.trim()) return

    const response = await keywordResearch.mutateAsync({
      projectId,
      type,
      keyword: seedKeyword.trim(),
      limit: 50,
    })

    if (type === 'related') {
      setResults(response.keywords || [])
    } else if (type === 'serp') {
      setResults(response.results?.map((r: { keyword: string; position: number; url: string }) => ({
        keyword: r.keyword,
        position: r.position,
        url: r.url,
      })) || [])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Keyword Research
        </CardTitle>
        <CardDescription>
          Discover related keywords and analyze SERP results using DataForSEO
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Enter a seed keyword..."
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleResearch('related')}
            className="flex-1"
          />
          <Button
            onClick={() => handleResearch('related')}
            disabled={keywordResearch.isPending}
          >
            {keywordResearch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Find Related
          </Button>
          <Button
            variant="outline"
            onClick={() => handleResearch('serp')}
            disabled={keywordResearch.isPending}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analyze SERP
          </Button>
        </div>

        {keywordResearch.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Fetching keyword data...</p>
            </div>
          </div>
        )}

        {!keywordResearch.isPending && results.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Search Volume</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>CPC</TableHead>
                  <TableHead>Competition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((kw, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell>{kw.search_volume?.toLocaleString() || '-'}</TableCell>
                    <TableCell>{kw.difficulty || '-'}</TableCell>
                    <TableCell>{kw.cpc ? `$${kw.cpc.toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{kw.competition?.toFixed(2) || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Main Page Component
export default function KeywordIntelPage() {
  const params = useParams()
  const brandId = params.brandId as string

  // Data hooks
  const { data: keywordsArray, isLoading: keywordsLoading, refetch: refetchKeywords } = useKeywords(brandId)
  const { data: project } = useProject(brandId)
  const keywords = (keywordsArray || []) as Keyword[]

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'domain' | 'discover' | 'manual' | 'research'>('overview')
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())

  // Import states
  const [importingBrandBible, setImportingBrandBible] = useState(false)
  const [scanningDomain, setScanningDomain] = useState(false)
  const [discoveringKeywords, setDiscoveringKeywords] = useState(false)
  const [savingKeywords, setSavingKeywords] = useState(false)

  // Results
  const [domainKeywords, setDomainKeywords] = useState<DomainKeyword[]>([])
  const [discoveredKeywords, setDiscoveredKeywords] = useState<DiscoveredKeyword[]>([])

  // Import from Brand Bible
  const importFromBrandBible = async () => {
    setImportingBrandBible(true)
    try {
      const response = await fetch('/api/keywords/import-brand-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: brandId }),
      })
      const data = await response.json()

      if (data.imported > 0) {
        await refetchKeywords()
        alert(`Imported ${data.imported} keywords from Brand Bible!`)
      } else {
        alert(data.message || 'No keywords found in Brand Bible')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import keywords')
    }
    setImportingBrandBible(false)
  }

  // Scan domain for ranking keywords
  const scanDomainKeywords = async () => {
    const website = (project as { website_url?: string })?.website_url
    if (!website) {
      alert('No website URL found for this brand. Please add one in Brand Settings.')
      return
    }

    setScanningDomain(true)
    setDomainKeywords([])

    try {
      const response = await fetch('/api/keywords/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: website, limit: 100 }),
      })
      const data = await response.json()

      if (data.error) {
        alert('Error: ' + data.error)
      } else if (data.keywords && data.keywords.length > 0) {
        setDomainKeywords(data.keywords.map((k: DomainKeyword) => ({ ...k, selected: false })))
        setActiveTab('domain')
      } else {
        alert('No ranking keywords found for this domain')
      }
    } catch (error) {
      console.error('Domain scan error:', error)
      alert('Failed to scan domain')
    }
    setScanningDomain(false)
  }

  // AI Keyword Discovery
  const discoverKeywords = async () => {
    setDiscoveringKeywords(true)
    setDiscoveredKeywords([])

    try {
      const projectData = project as { industry?: string; brand_bible?: { services?: string[]; target_audience?: string; competitors?: string[] } }
      const response = await fetch('/api/keywords/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: projectData?.industry,
          services: projectData?.brand_bible?.services,
          targetAudience: projectData?.brand_bible?.target_audience,
          competitors: projectData?.brand_bible?.competitors,
          existingKeywords: keywords.map(k => k.keyword),
        }),
      })
      const data = await response.json()

      if (data.keywords && data.keywords.length > 0) {
        setDiscoveredKeywords(data.keywords.map((k: DiscoveredKeyword) => ({ ...k, selected: false })))
        setActiveTab('discover')
      } else {
        alert('Failed to generate keyword ideas')
      }
    } catch (error) {
      console.error('Discovery error:', error)
      alert('Failed to discover keywords')
    }
    setDiscoveringKeywords(false)
  }

  // Save domain keywords
  const saveDomainKeywords = async () => {
    const selected = domainKeywords.filter(k => k.selected)
    if (selected.length === 0) return

    setSavingKeywords(true)
    try {
      const response = await fetch('/api/keywords/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: brandId,
          keywords: selected,
          source: 'domain_scan',
        }),
      })
      const data = await response.json()

      if (data.saved > 0) {
        await refetchKeywords()
        setDomainKeywords([])
        setActiveTab('overview')
        alert(`Saved ${data.saved} keywords!`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save keywords')
    }
    setSavingKeywords(false)
  }

  // Save discovered keywords
  const saveDiscoveredKeywords = async () => {
    const selected = discoveredKeywords.filter(k => k.selected)
    if (selected.length === 0) return

    setSavingKeywords(true)
    try {
      const response = await fetch('/api/keywords/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: brandId,
          keywords: selected.map(k => ({ keyword: k.keyword, intent: k.intent })),
          source: 'ai_discovery',
        }),
      })
      const data = await response.json()

      if (data.saved > 0) {
        await refetchKeywords()
        setDiscoveredKeywords([])
        setActiveTab('overview')
        alert(`Saved ${data.saved} keywords!`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save keywords')
    }
    setSavingKeywords(false)
  }

  // Selection handlers
  const toggleKeywordSelection = (id: string) => {
    const newSelected = new Set(selectedKeywords)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedKeywords(newSelected)
  }

  const selectAllKeywords = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedKeywords(new Set(keywords.map(k => k.id)))
    } else {
      setSelectedKeywords(new Set())
    }
  }

  // Send to optimizer
  const sendToOptimizer = async () => {
    if (selectedKeywords.size === 0) return

    const selected = keywords.filter(k => selectedKeywords.has(k.id))

    try {
      const tasks = selected.map(k => ({
        project_id: brandId,
        keyword_id: k.id,
        target_keyword: k.keyword,
        target_url: k.landing_page,
        status: 'pending',
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('optimization_tasks') as any).insert(tasks)

      if (error) throw error

      alert(`Added ${tasks.length} keywords to Content Optimizer!`)
      setSelectedKeywords(new Set())
    } catch (error) {
      console.error('Send error:', error)
      alert('Failed to create optimization tasks')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Keyword Intel
          </h1>
          <p className="text-muted-foreground">
            Discover and manage your target keywords from multiple sources
          </p>
        </div>
        {selectedKeywords.size > 0 && (
          <Button onClick={sendToOptimizer}>
            <Send className="h-4 w-4 mr-2" />
            Optimize ({selectedKeywords.size})
          </Button>
        )}
      </div>

      {/* Keyword Source Buttons */}
      <KeywordSourceButtons
        onImportBrandBible={importFromBrandBible}
        onScanDomain={scanDomainKeywords}
        onAIDiscovery={discoverKeywords}
        onManualEntry={() => setActiveTab('manual')}
        importingBrandBible={importingBrandBible}
        scanningDomain={scanningDomain}
        discoveringKeywords={discoveringKeywords}
      />

      {/* Stats */}
      <KeywordStats keywords={keywords} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Your Keywords
            <Badge variant="secondary" className="ml-1">{keywords.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domain Scan
            {domainKeywords.length > 0 && (
              <Badge variant="secondary" className="ml-1">{domainKeywords.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Discovered
            {discoveredKeywords.length > 0 && (
              <Badge variant="secondary" className="ml-1">{discoveredKeywords.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Keywords
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Research
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            projectId={brandId}
            keywords={keywords}
            isLoading={keywordsLoading}
            selectedKeywords={selectedKeywords}
            onToggleSelection={toggleKeywordSelection}
            onSelectAll={selectAllKeywords}
            onRefresh={() => refetchKeywords()}
            isRefreshing={false}
          />
        </TabsContent>

        <TabsContent value="domain">
          <DomainScanTab
            domainKeywords={domainKeywords}
            onSave={saveDomainKeywords}
            onToggleSelection={(i) => {
              const updated = [...domainKeywords]
              updated[i].selected = !updated[i].selected
              setDomainKeywords(updated)
            }}
            onSelectAll={(selectAll) => {
              setDomainKeywords(domainKeywords.map(k => ({ ...k, selected: selectAll })))
            }}
            saving={savingKeywords}
          />
        </TabsContent>

        <TabsContent value="discover">
          <AIDiscoveryTab
            discoveredKeywords={discoveredKeywords}
            onSave={saveDiscoveredKeywords}
            onToggleSelection={(i) => {
              const updated = [...discoveredKeywords]
              updated[i].selected = !updated[i].selected
              setDiscoveredKeywords(updated)
            }}
            onSelectAll={(selectAll) => {
              setDiscoveredKeywords(discoveredKeywords.map(k => ({ ...k, selected: selectAll })))
            }}
            saving={savingKeywords}
          />
        </TabsContent>

        <TabsContent value="manual">
          <ManualEntryTab
            projectId={brandId}
            onKeywordsAdded={() => refetchKeywords()}
          />
        </TabsContent>

        <TabsContent value="research">
          <ResearchTab projectId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
