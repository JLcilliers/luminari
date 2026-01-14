'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  BookOpen,
  Radio,
  MessageSquare,
  Bot,
  Users,
  Rocket,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { useProject, useMonitors, usePrompts, useResponseStats, useCompetitors } from '@/hooks'

interface SetupChecklistProps {
  projectId: string
}

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: React.ReactNode
  actionLabel: string
  completedLabel?: string
}

export function SetupChecklist({ projectId }: SetupChecklistProps) {
  const { data: project } = useProject(projectId)
  const { data: monitors } = useMonitors(projectId)
  const { data: prompts } = usePrompts(projectId)
  const { data: responseStats } = useResponseStats(projectId)
  const { data: competitors } = useCompetitors(projectId)

  // Determine completion status for each item
  const hasBrandBible = !!(project?.tracked_brand && project?.industry)
  const hasMonitors = (monitors?.length ?? 0) > 0
  const hasPrompts = (prompts?.length ?? 0) > 0
  const hasResponses = (responseStats?.total ?? 0) > 0
  const hasCompetitors = (competitors?.length ?? 0) > 0

  const checklistItems: ChecklistItem[] = [
    {
      id: 'brand-bible',
      title: 'Brand Bible Created',
      description: 'Your brand identity and positioning is defined',
      completed: hasBrandBible,
      href: `/brand/${projectId}/brand-bible`,
      icon: <BookOpen className="h-5 w-5" />,
      actionLabel: 'Create Brand Bible',
      completedLabel: 'View Brand Bible'
    },
    {
      id: 'monitors',
      title: 'Set Up Monitors',
      description: 'Configure what AI platforms and topics to track',
      completed: hasMonitors,
      href: `/brand/${projectId}/monitors`,
      icon: <Radio className="h-5 w-5" />,
      actionLabel: 'Add Monitors',
      completedLabel: 'View Monitors'
    },
    {
      id: 'prompts',
      title: 'Add Prompts',
      description: 'Define the questions to ask AI platforms about your brand',
      completed: hasPrompts,
      href: `/brand/${projectId}/prompts`,
      icon: <MessageSquare className="h-5 w-5" />,
      actionLabel: 'Create Prompts',
      completedLabel: 'View Prompts'
    },
    {
      id: 'responses',
      title: 'Collect AI Responses',
      description: 'Start collecting responses from AI platforms',
      completed: hasResponses,
      href: `/brand/${projectId}/responses`,
      icon: <Bot className="h-5 w-5" />,
      actionLabel: 'Collect Responses',
      completedLabel: 'View Responses'
    },
    {
      id: 'competitors',
      title: 'Track Competitors',
      description: 'Monitor how competitors appear in AI responses',
      completed: hasCompetitors,
      href: `/brand/${projectId}/settings?tab=competitors`,
      icon: <Users className="h-5 w-5" />,
      actionLabel: 'Add Competitors',
      completedLabel: 'View Competitors'
    }
  ]

  const completedCount = checklistItems.filter(item => item.completed).length
  const totalCount = checklistItems.length
  const progressPercent = (completedCount / totalCount) * 100
  const allComplete = completedCount === totalCount

  // Find the next incomplete item
  const nextItem = checklistItems.find(item => !item.completed)

  if (allComplete) {
    return null // Hide checklist when everything is set up
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Get Started with Monitoring
            </CardTitle>
            <CardDescription>
              Complete these steps to start tracking your AI visibility
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{totalCount}</div>
            <div className="text-xs text-muted-foreground">steps complete</div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {checklistItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              item.completed
                ? 'bg-green-500/5'
                : index === checklistItems.findIndex(i => !i.completed)
                  ? 'bg-primary/5 border border-primary/20'
                  : 'opacity-60'
            }`}
          >
            <div className={`flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
              {item.completed ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </div>
            <div className={`flex-shrink-0 p-2 rounded-lg ${
              item.completed ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {item.description}
              </p>
            </div>
            <Link href={item.href}>
              <Button
                size="sm"
                variant={item.completed ? 'ghost' : index === checklistItems.findIndex(i => !i.completed) ? 'default' : 'outline'}
              >
                {item.completed ? (item.completedLabel || 'View') : item.actionLabel}
                {item.completed ? (
                  <ExternalLink className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            </Link>
          </div>
        ))}

        {nextItem && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              <strong>Next step:</strong> {nextItem.description}
            </p>
            <Link href={nextItem.href}>
              <Button className="w-full">
                {nextItem.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
