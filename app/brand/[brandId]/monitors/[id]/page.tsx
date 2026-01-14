'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, Settings, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AI_MODEL_LABELS, type AIModel } from '@/lib/types';

// Placeholder data
const monitor = {
  id: '1',
  name: 'Product Reviews Monitor',
  language: 'en',
  location: 'US',
  ai_models: ['chatgpt', 'claude', 'gemini'] as AIModel[],
  is_active: true,
  created_at: '2024-01-01',
};

const prompts = [
  {
    id: '1',
    prompt_text: 'What are the best project management tools?',
    intent_type: 'commercial' as const,
    responses_count: 25,
    mentions_rate: 68,
  },
  {
    id: '2',
    prompt_text: 'How to improve team productivity?',
    intent_type: 'organic' as const,
    responses_count: 18,
    mentions_rate: 45,
  },
  {
    id: '3',
    prompt_text: 'Best tools for remote team collaboration',
    intent_type: 'commercial' as const,
    responses_count: 32,
    mentions_rate: 72,
  },
];

const recentRuns = [
  { date: '2024-01-15 10:30', prompts: 15, responses: 75, mentions: 52 },
  { date: '2024-01-14 10:30', prompts: 15, responses: 75, mentions: 48 },
  { date: '2024-01-13 10:30', prompts: 15, responses: 75, mentions: 55 },
];

export default function MonitorDetailPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const monitorId = params.id as string;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href={`/brand/${brandId}/monitors`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{monitor.name}</h1>
            <Badge variant={monitor.is_active ? 'default' : 'secondary'}>
              {monitor.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {monitor.language.toUpperCase()} / {monitor.location} • Created {monitor.created_at}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Run Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">225</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Mention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {monitor.ai_models.map((model) => (
                <Badge key={model} variant="secondary" className="text-xs">
                  {AI_MODEL_LABELS[model]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Monitor Prompts</h2>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Prompt
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Prompt</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Mention Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell className="font-medium">
                      {prompt.prompt_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant={prompt.intent_type === 'commercial' ? 'default' : 'secondary'}>
                        {prompt.intent_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{prompt.responses_count}</TableCell>
                    <TableCell className="text-right">
                      <span className={prompt.mentions_rate >= 50 ? 'text-green-600' : ''}>
                        {prompt.mentions_rate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Prompts</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Mentions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run, index) => (
                  <TableRow key={index}>
                    <TableCell>{run.date}</TableCell>
                    <TableCell className="text-right">{run.prompts}</TableCell>
                    <TableCell className="text-right">{run.responses}</TableCell>
                    <TableCell className="text-right">{run.mentions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitor Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monitor settings configuration coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
