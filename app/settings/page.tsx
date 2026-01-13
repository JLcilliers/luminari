'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database, Key, Loader2, Map } from 'lucide-react'
import { useProjects } from '@/hooks'
import { BrandBookForm, CompetitorList, PersonaList } from '@/components/settings'

export default function SettingsPage() {
  const { data: projects, isLoading } = useProjects()
  const project = projects?.[0] // Use first project for now

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your project and monitoring settings
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your project and monitoring settings
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No project found. Please create a project first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your project and monitoring settings
        </p>
      </div>

      <Tabs defaultValue="brand-book" className="w-full">
        <TabsList>
          <TabsTrigger value="brand-book">Brand Book</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="brand-book" className="space-y-6 mt-6">
          <BrandBookForm projectId={project.id} />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6 mt-6">
          <CompetitorList projectId={project.id} />
        </TabsContent>

        <TabsContent value="personas" className="space-y-6 mt-6">
          <PersonaList projectId={project.id} />
        </TabsContent>

        <TabsContent value="sitemap" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Sitemap Management
              </CardTitle>
              <CardDescription>
                Index your website pages to track AI citations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitemap URL</label>
                <Input
                  placeholder="https://yourbrand.com/sitemap.xml"
                  defaultValue={project.sitemap_url || ''}
                />
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline">Fetch Sitemap</Button>
                <span className="text-sm text-muted-foreground">
                  {project.indexed_pages || 0} pages indexed
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sitemap indexing will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>
                Supabase connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supabase URL</label>
                <Input
                  type="password"
                  placeholder="https://your-project.supabase.co"
                  defaultValue="••••••••••••"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Anon Key</label>
                <Input
                  type="password"
                  placeholder="your-anon-key"
                  defaultValue="••••••••••••"
                  disabled
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Database is connected via environment variables
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                AI Provider API Keys
              </CardTitle>
              <CardDescription>
                Configure API keys for AI model providers (for data collection)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">OpenAI API Key</label>
                  <Input type="password" placeholder="sk-..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anthropic API Key</label>
                  <Input type="password" placeholder="sk-ant-..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google AI API Key</label>
                  <Input type="password" placeholder="AI..." />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                API key management will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
