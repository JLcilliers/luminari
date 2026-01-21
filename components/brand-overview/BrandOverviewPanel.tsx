'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  FileText,
  Building2,
  Target,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { BrandOverview, BrandOverviewStatus, ExtendedBrandBible } from '@/lib/types';

interface BrandOverviewPanelProps {
  projectId: string;
  websiteUrl?: string | null;
  autoTrigger?: boolean; // Auto-trigger generation on mount if no overview exists
}

const POLL_INTERVAL = 3000; // Poll every 3 seconds when generating

export function BrandOverviewPanel({
  projectId,
  websiteUrl,
  autoTrigger = true,
}: BrandOverviewPanelProps) {
  const [overview, setOverview] = useState<BrandOverview | null>(null);
  const [status, setStatus] = useState<BrandOverviewStatus | 'LOADING' | 'NONE'>('LOADING');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch the current brand overview
  const fetchOverview = useCallback(async () => {
    try {
      const response = await fetch(`/api/brand/${projectId}/brand-overview`);
      const data = await response.json();

      if (data.success && data.data) {
        setOverview(data.data);
        setStatus(data.data.status);
        setError(null);
      } else {
        setOverview(null);
        setStatus('NONE');
      }
    } catch (err) {
      console.error('Failed to fetch brand overview:', err);
      setError('Failed to load brand overview');
      setStatus('NONE');
    }
  }, [projectId]);

  // Trigger generation
  const triggerGeneration = useCallback(async (force = false) => {
    if (!websiteUrl) {
      setError('No website URL configured for this brand');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/brand/${projectId}/brand-overview/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('RUNNING');
        // Start polling
        fetchOverview();
      } else {
        setError(data.error || 'Failed to start generation');
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Failed to trigger generation:', err);
      setError('Failed to start brand overview generation');
      setIsGenerating(false);
    }
  }, [projectId, websiteUrl, fetchOverview]);

  // Initial fetch
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Auto-trigger on first load if no overview exists
  useEffect(() => {
    if (autoTrigger && !hasTriggered && status === 'NONE' && websiteUrl) {
      setHasTriggered(true);
      triggerGeneration();
    }
  }, [autoTrigger, hasTriggered, status, websiteUrl, triggerGeneration]);

  // Poll while generating
  useEffect(() => {
    if (status === 'RUNNING') {
      const interval = setInterval(() => {
        fetchOverview();
      }, POLL_INTERVAL);

      return () => clearInterval(interval);
    } else {
      setIsGenerating(false);
    }
  }, [status, fetchOverview]);

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'LOADING':
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        );

      case 'NONE':
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No Brand Overview Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {websiteUrl
                ? 'Generate an AI-powered overview of your brand based on your website.'
                : 'Add a website URL to your brand to generate an overview.'}
            </p>
            {websiteUrl && (
              <Button onClick={() => triggerGeneration()} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Brand Overview
                  </>
                )}
              </Button>
            )}
          </div>
        );

      case 'PENDING':
      case 'RUNNING':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-medium mb-2">Generating Brand Overview</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Analyzing your website and generating insights...
            </p>
            <div className="space-y-2 text-sm text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Crawling website pages</span>
              </div>
              <div className="flex items-center gap-2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Analyzing content with AI</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 rounded-full border" />
                <span>Generating brand bible</span>
              </div>
            </div>
          </div>
        );

      case 'FAILED':
        return (
          <div className="py-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>
                {overview?.error || 'An error occurred while generating the brand overview.'}
              </AlertDescription>
            </Alert>
            {overview?.warnings && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {overview.warnings}
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-4 text-center">
              <Button onClick={() => triggerGeneration(true)} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Generation
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'COMPLETE':
        return (
          <div className="space-y-6">
            {overview?.warnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {overview.warnings}
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Stats */}
            {overview?.raw_json && (
              <BrandOverviewStats brandBible={overview.raw_json as ExtendedBrandBible} />
            )}

            {/* Markdown Summary */}
            {overview?.summary_md && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownContent content={overview.summary_md} />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Last updated: {overview?.updated_at ? new Date(overview.updated_at).toLocaleString() : 'Unknown'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerGeneration(true)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Brand Overview</CardTitle>
              <CardDescription>AI-generated brand analysis</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderContent()}
        </CardContent>
      )}
    </Card>
  );
}

// Status badge component
function StatusBadge({ status }: { status: BrandOverviewStatus | 'LOADING' | 'NONE' }) {
  switch (status) {
    case 'LOADING':
      return <Badge variant="secondary">Loading...</Badge>;
    case 'NONE':
      return <Badge variant="outline">Not Generated</Badge>;
    case 'PENDING':
    case 'RUNNING':
      return (
        <Badge variant="secondary" className="animate-pulse">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Generating
        </Badge>
      );
    case 'COMPLETE':
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

// Quick stats from brand bible
function BrandOverviewStats({ brandBible }: { brandBible: ExtendedBrandBible }) {
  const stats = [
    {
      icon: Building2,
      label: 'Industry',
      value: brandBible.industry || 'Unknown',
    },
    {
      icon: Target,
      label: 'USPs',
      value: brandBible.unique_selling_points?.length.toString() || '0',
    },
    {
      icon: MessageSquare,
      label: 'Keywords',
      value: brandBible.important_keywords?.length.toString() || '0',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center p-3 bg-muted/50 rounded-lg">
          <stat.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// Simple markdown renderer
function MarkdownContent({ content }: { content: string }) {
  // Simple markdown to HTML conversion
  const html = content
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>')
    .replace(/^\*\*(.+):\*\* (.+)$/gm, '<p class="mb-1"><strong>$1:</strong> $2</p>')
    .replace(/^\*\*(.+)\*\*$/gm, '<p class="font-medium">$1</p>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
