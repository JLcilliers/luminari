import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Database, Globe, Bell, Key } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your project and monitoring settings
        </p>
      </div>

      <Tabs defaultValue="project" className="w-full">
        <TabsList>
          <TabsTrigger value="project">Project</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Project Settings
              </CardTitle>
              <CardDescription>
                Configure your project and tracked brand information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input placeholder="My Project" defaultValue="PromptWatch Demo" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tracked Brand</label>
                  <Input placeholder="Your Brand Name" defaultValue="YourBrand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL</label>
                  <Input placeholder="https://yourbrand.com" defaultValue="https://yourbrand.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Domain Aliases</label>
                  <Input placeholder="yourbrand.io, brand.co" />
                </div>
              </div>
              <Button>Save Changes</Button>
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
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Anon Key</label>
                <Input
                  type="password"
                  placeholder="your-anon-key"
                  defaultValue="••••••••••••"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last synced: 2 minutes ago
                </span>
              </div>
              <Button variant="outline">Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Notification settings will be available in a future update.
              </p>
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
              <Button>Save API Keys</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
