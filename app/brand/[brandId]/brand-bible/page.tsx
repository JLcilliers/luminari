'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  BookOpen,
  X,
  Plus,
  Loader2,
  Sparkles,
  Target,
  MessageSquare,
  Lightbulb,
  Tags,
  Hash,
  Ban,
  Award,
  Users,
  RefreshCw,
  Check,
  Wand2,
  Download,
  FileJson,
  FileText,
} from 'lucide-react'
import { useProject, useUpdateProject } from '@/hooks'
import type { BrandVoice } from '@/lib/types'
import { BRAND_VOICE_OPTIONS } from '@/lib/types'
import { toast } from 'sonner'
import { exportBrandBibleAsPDF, exportBrandBibleAsJSON } from '@/lib/export-utils'

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

export default function BrandBiblePage() {
  const params = useParams()
  const projectId = params.brandId as string

  const { data: project, isLoading } = useProject(projectId)
  const updateProject = useUpdateProject()

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    tracked_brand: '',
    website_url: '',
    industry: '',
    description: '',
    key_messages: [] as string[],
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
      setHasChanges(false)
    }
  }, [project])

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        ...formData,
        brand_voice: formData.brand_voice || undefined,
      })
      setHasChanges(false)
      toast.success('Brand Bible saved successfully')
    } catch (error) {
      toast.error('Failed to save Brand Bible')
    }
  }

  const handleEnhanceWithAI = async () => {
    setShowEnhanceDialog(false)
    setIsEnhancing(true)

    try {
      const response = await fetch('/api/enhance-brand-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          currentData: formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Enhancement failed')
      }

      const { enhancedData, suggestions } = await response.json()

      // Update form with enhanced data
      setFormData(prev => ({
        ...prev,
        ...enhancedData,
      }))
      setHasChanges(true)

      if (suggestions && suggestions.length > 0) {
        toast.success(`AI enhanced your Brand Bible with ${suggestions.length} improvements`)
      } else {
        toast.success('Brand Bible enhanced by AI')
      }
    } catch (error) {
      toast.error('Failed to enhance Brand Bible. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Brand Bible
          </h1>
          <p className="text-muted-foreground">
            Define your brand identity to help AI understand your positioning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (project) {
                exportBrandBibleAsJSON(project)
                toast.success('JSON file downloaded')
              }
            }}
            disabled={!project}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Download JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (project) {
                exportBrandBibleAsPDF(project)
                toast.success('PDF file downloaded')
              }
            }}
            disabled={!project}
          >
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowEnhanceDialog(true)}
            disabled={isEnhancing}
          >
            {isEnhancing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Enhance with AI
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateProject.isPending || !hasChanges}
          >
            {updateProject.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
          You have unsaved changes. Click "Save Changes" to update your Brand Bible.
        </div>
      )}

      <div className="grid gap-6">
        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>Core details about your brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Project"
                />
              </div>
              <div className="space-y-2">
                <Label>Tracked Brand</Label>
                <Input
                  value={formData.tracked_brand}
                  onChange={(e) => updateField('tracked_brand', e.target.value)}
                  placeholder="Your Brand Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => updateField('website_url', e.target.value)}
                  placeholder="https://yourbrand.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="e.g., AI/SaaS, E-commerce, Healthcare"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe what your brand does and its unique value proposition..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice & Tone Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Voice & Tone
            </CardTitle>
            <CardDescription>How your brand communicates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Brand Voice</Label>
                <Select
                  value={formData.brand_voice}
                  onValueChange={(value: BrandVoice) => updateField('brand_voice', value)}
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
                  onChange={(e) => updateField('target_audience', e.target.value)}
                  placeholder="e.g., Small business owners, enterprise marketers"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone Guidelines</Label>
              <Textarea
                value={formData.tone_guidelines}
                onChange={(e) => updateField('tone_guidelines', e.target.value)}
                placeholder="Describe how your brand should communicate. E.g., 'Always be helpful and solution-oriented. Use clear, jargon-free language.'"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Differentiators & USPs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Differentiators & Value Props
            </CardTitle>
            <CardDescription>What makes your brand unique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ArrayInput
              label="Unique Selling Points"
              description="What makes your brand stand out from competitors?"
              icon={Award}
              values={formData.unique_selling_points}
              placeholder="Add a unique selling point..."
              onChange={(values) => updateField('unique_selling_points', values)}
            />

            <ArrayInput
              label="Key Differentiators"
              description="Core features or qualities that differentiate your brand"
              icon={Target}
              values={formData.key_differentiators}
              placeholder="Add a differentiator..."
              onChange={(values) => updateField('key_differentiators', values)}
            />
          </CardContent>
        </Card>

        {/* Content Strategy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Content Strategy
            </CardTitle>
            <CardDescription>Topics and keywords for your content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ArrayInput
              label="Content Pillars"
              description="Main topics and themes your content should focus on"
              icon={Tags}
              values={formData.content_pillars}
              placeholder="Add a content pillar..."
              onChange={(values) => updateField('content_pillars', values)}
            />

            <ArrayInput
              label="Important Keywords"
              description="Keywords and phrases that should appear in content about your brand"
              icon={Hash}
              values={formData.important_keywords}
              placeholder="Add a keyword..."
              onChange={(values) => updateField('important_keywords', values)}
            />

            <ArrayInput
              label="Key Messages"
              description="Core messages you want AI to associate with your brand"
              icon={MessageSquare}
              values={formData.key_messages}
              placeholder="Add a key message..."
              onChange={(values) => updateField('key_messages', values)}
            />
          </CardContent>
        </Card>

        {/* Personas & Topics to Avoid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personas & Guidelines
            </CardTitle>
            <CardDescription>Target personas and content guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ArrayInput
              label="Target Personas"
              description="Specific customer personas you want to reach"
              icon={Users}
              values={formData.target_personas}
              placeholder="Add a persona (e.g., 'Marketing Manager at SMB')..."
              onChange={(values) => updateField('target_personas', values)}
            />

            <ArrayInput
              label="Topics to Avoid"
              description="Subjects or themes that should not be associated with your brand"
              icon={Ban}
              values={formData.avoid_topics}
              placeholder="Add a topic to avoid..."
              onChange={(values) => updateField('avoid_topics', values)}
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Enhancement Dialog */}
      <AlertDialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Enhance Brand Bible with AI
            </AlertDialogTitle>
            <AlertDialogDescription>
              AI will analyze your current Brand Bible and suggest improvements:
              <ul className="mt-3 space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Fill in missing fields based on existing data
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Suggest additional keywords and differentiators
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Refine messaging for better AI visibility
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Remember all your edits and preferences
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnhanceWithAI}>
              Enhance Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
