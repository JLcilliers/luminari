'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BookOpen, X, Plus, Loader2 } from 'lucide-react'
import { useProject, useUpdateProject } from '@/hooks'
import type { Project } from '@/lib/types'

interface BrandBookFormProps {
  projectId: string
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
  })
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        tracked_brand: project.tracked_brand || '',
        website_url: project.website_url || '',
        industry: project.industry || '',
        description: project.description || '',
        key_messages: project.key_messages || [],
      })
    }
  }, [project])

  const handleSave = async () => {
    await updateProject.mutateAsync({
      id: projectId,
      ...formData,
    })
  }

  const addKeyMessage = () => {
    if (newMessage.trim()) {
      setFormData(prev => ({
        ...prev,
        key_messages: [...prev.key_messages, newMessage.trim()]
      }))
      setNewMessage('')
    }
  }

  const removeKeyMessage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      key_messages: prev.key_messages.filter((_, i) => i !== index)
    }))
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
          Define your brand identity to help AI understand your positioning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Project"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tracked Brand</label>
            <Input
              value={formData.tracked_brand}
              onChange={(e) => setFormData(prev => ({ ...prev, tracked_brand: e.target.value }))}
              placeholder="Your Brand Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Website URL</label>
            <Input
              value={formData.website_url}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://yourbrand.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <Input
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              placeholder="e.g., AI/SaaS, E-commerce, Healthcare"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Brand Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what your brand does and its unique value proposition..."
            rows={3}
          />
        </div>

        {/* Key Messages */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Key Messages</label>
          <p className="text-sm text-muted-foreground">
            Core messages you want AI to associate with your brand
          </p>

          <div className="flex flex-wrap gap-2">
            {formData.key_messages.map((message, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 py-1.5 px-3"
              >
                {message}
                <button
                  onClick={() => removeKeyMessage(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Add a key message..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyMessage())}
            />
            <Button variant="outline" onClick={addKeyMessage}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

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
      </CardContent>
    </Card>
  )
}
