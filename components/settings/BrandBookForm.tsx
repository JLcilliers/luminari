'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, X, Plus, Loader2, Sparkles, Target, MessageSquare, Lightbulb, Tags, Hash, Ban, Award, Users } from 'lucide-react'
import { useProject, useUpdateProject } from '@/hooks'
import type { Project, BrandVoice } from '@/lib/types'
import { BRAND_VOICE_OPTIONS } from '@/lib/types'

interface BrandBookFormProps {
  projectId: string
}

// Reusable component for array inputs (tags)
function ArrayInput({
  label,
  description,
  icon: Icon,
  values,
  placeholder,
  onChange,
}: {
  label: string
  description?: string
  icon: React.ElementType
  values: string[]
  placeholder: string
  onChange: (values: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const addItem = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()])
      setInputValue('')
    }
  }

  const removeItem = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {values.map((item, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 py-1.5 px-3"
          >
            {item}
            <button
              onClick={() => removeItem(index)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
        />
        <Button variant="outline" onClick={addItem} type="button">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function BrandBookForm({ projectId }: BrandBookFormProps) {
  const { data: project, isLoading } = useProject(projectId)
  const updateProject = useUpdateProject()

  const [formData, setFormData] = useState({
    name: '',
    tracked_brand: '',
    website_url: '',
    industry: '',
    description: '',
    key_messages: [] as string[],
    // Enhanced Brand Bible fields (Phase 5A)
    target_audience: '',
    brand_voice: '' as BrandVoice | '',
    tone_guidelines: '',
    key_differentiators: [] as string[],
    important_keywords: [] as string[],
    content_pillars: [] as string[],
    avoid_topics: [] as string[],
    unique_selling_points: [] as string[],
    target_personas: [] as string[],
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        tracked_brand: project.tracked_brand || '',
        website_url: project.website_url || '',
        industry: project.industry || '',
        description: project.description || '',
        key_messages: project.key_messages || [],
        // Enhanced Brand Bible fields
        target_audience: project.target_audience || '',
        brand_voice: project.brand_voice || '',
        tone_guidelines: project.tone_guidelines || '',
        key_differentiators: project.key_differentiators || [],
        important_keywords: project.important_keywords || [],
        content_pillars: project.content_pillars || [],
        avoid_topics: project.avoid_topics || [],
        unique_selling_points: project.unique_selling_points || [],
        target_personas: project.target_personas || [],
      })
    }
  }, [project])

  const handleSave = async () => {
    await updateProject.mutateAsync({
      id: projectId,
      ...formData,
      brand_voice: formData.brand_voice || undefined,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Brand Book
        </CardTitle>
        <CardDescription>
          Define your brand identity to help AI understand your positioning and generate better content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Basic Information
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Project"
              />
            </div>
            <div className="space-y-2">
              <Label>Tracked Brand</Label>
              <Input
                value={formData.tracked_brand}
                onChange={(e) => setFormData(prev => ({ ...prev, tracked_brand: e.target.value }))}
                placeholder="Your Brand Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://yourbrand.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., AI/SaaS, E-commerce, Healthcare"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your brand does and its unique value proposition..."
              rows={3}
            />
          </div>
        </div>

        {/* Voice & Tone Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Voice & Tone
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand Voice</Label>
              <Select
                value={formData.brand_voice}
                onValueChange={(value: BrandVoice) => setFormData(prev => ({ ...prev, brand_voice: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice..." />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_VOICE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input
                value={formData.target_audience}
                onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="e.g., Small business owners, enterprise marketers"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tone Guidelines</Label>
            <Textarea
              value={formData.tone_guidelines}
              onChange={(e) => setFormData(prev => ({ ...prev, tone_guidelines: e.target.value }))}
              placeholder="Describe how your brand should communicate. E.g., 'Always be helpful and solution-oriented. Use clear, jargon-free language. Be encouraging but not pushy.'"
              rows={3}
            />
          </div>
        </div>

        {/* Differentiators & USPs Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Differentiators & Value Props
          </h3>

          <ArrayInput
            label="Unique Selling Points"
            description="What makes your brand stand out from competitors?"
            icon={Award}
            values={formData.unique_selling_points}
            placeholder="Add a unique selling point..."
            onChange={(values) => setFormData(prev => ({ ...prev, unique_selling_points: values }))}
          />

          <ArrayInput
            label="Key Differentiators"
            description="Core features or qualities that differentiate your brand"
            icon={Target}
            values={formData.key_differentiators}
            placeholder="Add a differentiator..."
            onChange={(values) => setFormData(prev => ({ ...prev, key_differentiators: values }))}
          />
        </div>

        {/* Content Strategy Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Content Strategy
          </h3>

          <ArrayInput
            label="Content Pillars"
            description="Main topics and themes your content should focus on"
            icon={Tags}
            values={formData.content_pillars}
            placeholder="Add a content pillar..."
            onChange={(values) => setFormData(prev => ({ ...prev, content_pillars: values }))}
          />

          <ArrayInput
            label="Important Keywords"
            description="Keywords and phrases that should appear in content about your brand"
            icon={Hash}
            values={formData.important_keywords}
            placeholder="Add a keyword..."
            onChange={(values) => setFormData(prev => ({ ...prev, important_keywords: values }))}
          />

          <ArrayInput
            label="Key Messages"
            description="Core messages you want AI to associate with your brand"
            icon={MessageSquare}
            values={formData.key_messages}
            placeholder="Add a key message..."
            onChange={(values) => setFormData(prev => ({ ...prev, key_messages: values }))}
          />
        </div>

        {/* Personas & Topics to Avoid */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personas & Guidelines
          </h3>

          <ArrayInput
            label="Target Personas"
            description="Specific customer personas you want to reach"
            icon={Users}
            values={formData.target_personas}
            placeholder="Add a persona (e.g., 'Marketing Manager at SMB')..."
            onChange={(values) => setFormData(prev => ({ ...prev, target_personas: values }))}
          />

          <ArrayInput
            label="Topics to Avoid"
            description="Subjects or themes that should not be associated with your brand"
            icon={Ban}
            values={formData.avoid_topics}
            placeholder="Add a topic to avoid..."
            onChange={(values) => setFormData(prev => ({ ...prev, avoid_topics: values }))}
          />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={updateProject.isPending}>
            {updateProject.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
