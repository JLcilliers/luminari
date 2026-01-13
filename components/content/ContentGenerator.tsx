'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles, X, Plus, FileText, CheckCircle2 } from 'lucide-react'
import { useGenerateContent, useProjects, useCompetitors } from '@/hooks'
import { CONTENT_TYPES, type ContentType, type ContentGenerationRequest } from '@/lib/types'

interface ContentGeneratorProps {
  initialPrompt?: string
  promptId?: string
  onSuccess?: (content: unknown) => void
}

export function ContentGenerator({ initialPrompt = '', promptId, onSuccess }: ContentGeneratorProps) {
  const { data: projects } = useProjects()
  const { data: competitors } = useCompetitors()
  const generateContent = useGenerateContent()

  const [promptText, setPromptText] = useState(initialPrompt)
  const [contentType, setContentType] = useState<ContentType>('article')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [tone, setTone] = useState<'professional' | 'casual' | 'authoritative' | 'friendly'>('professional')
  const [wordCountTarget, setWordCountTarget] = useState(1500)
  const [includeCompetitors, setIncludeCompetitors] = useState(false)

  const brandName = projects?.[0]?.tracked_brand || 'Your Brand'
  const competitorNames = competitors?.map(c => c.name) || []

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleGenerate = async () => {
    if (!promptText.trim()) return

    // Auto-add prompt text as keyword if no keywords specified
    const targetKeywords = keywords.length > 0 ? keywords : [promptText.trim()]

    const request: ContentGenerationRequest = {
      promptId,
      promptText: promptText.trim(),
      contentType,
      targetKeywords,
      brandName,
      competitors: includeCompetitors ? competitorNames : undefined,
      tone,
      wordCountTarget,
    }

    try {
      const result = await generateContent.mutateAsync(request)
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (error) {
      console.error('Generation failed:', error)
    }
  }

  const selectedContentType = CONTENT_TYPES.find(t => t.value === contentType)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Content Generator
        </CardTitle>
        <CardDescription>
          Generate SEO and GEO optimized content for your Answer Gaps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Topic/Query Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Topic or Query</Label>
          <Textarea
            id="prompt"
            placeholder="Enter the topic or question you want to create content for..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This is the main topic your content will address
          </p>
        </div>

        {/* Content Type Selection */}
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col items-start">
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedContentType && (
            <p className="text-xs text-muted-foreground">{selectedContentType.description}</p>
          )}
        </div>

        {/* Target Keywords */}
        <div className="space-y-2">
          <Label>Target Keywords</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a keyword..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
            />
            <Button type="button" variant="outline" onClick={handleAddKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Keywords to include naturally in the content. If empty, the topic will be used.
          </p>
        </div>

        {/* Tone and Word Count */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Word Count</Label>
            <Input
              type="number"
              value={wordCountTarget}
              onChange={(e) => setWordCountTarget(parseInt(e.target.value) || 1500)}
              min={500}
              max={5000}
              step={100}
            />
          </div>
        </div>

        {/* Competitor Inclusion */}
        {competitorNames.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeCompetitors"
                checked={includeCompetitors}
                onChange={(e) => setIncludeCompetitors(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeCompetitors" className="cursor-pointer">
                Include competitor comparison
              </Label>
            </div>
            {includeCompetitors && (
              <div className="flex flex-wrap gap-2 mt-2">
                {competitorNames.map(name => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Position {brandName} favorably against competitors
            </p>
          </div>
        )}

        {/* Brand Info */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Generating for:</span>{' '}
            <span className="font-medium">{brandName}</span>
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!promptText.trim() || generateContent.isPending}
          className="w-full"
          size="lg"
        >
          {generateContent.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>

        {/* Error Display */}
        {generateContent.isError && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              {generateContent.error instanceof Error
                ? generateContent.error.message
                : 'Failed to generate content'}
            </p>
          </div>
        )}

        {/* Success Display */}
        {generateContent.isSuccess && (
          <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/20 p-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Content generated successfully!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
