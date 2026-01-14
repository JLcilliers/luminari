'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ExternalLink, ThumbsUp, ThumbsDown, Minus, Loader2, Play, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AI_MODEL_LABELS, AI_MODEL_COLORS, AI_MODELS, type AIModel } from '@/lib/types';
import { useResponses, usePrompts, type ResponseWithPrompt } from '@/hooks';
import { toast } from 'sonner';

function getSentimentIcon(score: number | null) {
  if (score === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (score >= 0.7) return <ThumbsUp className="h-4 w-4 text-green-600" />;
  if (score >= 0.4) return <Minus className="h-4 w-4 text-yellow-600" />;
  return <ThumbsDown className="h-4 w-4 text-red-600" />;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type TabFilter = 'all' | 'mentions' | 'citations' | 'featured';
type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

export default function ResponsesPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const queryClient = useQueryClient();

  const { data: responses, isLoading } = useResponses(brandId);
  const { data: prompts } = usePrompts(brandId);

  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [isCollecting, setIsCollecting] = useState(false);

  const promptCount = prompts?.length || 0;
  const hasPrompts = promptCount > 0;

  const handleCollectResponses = async () => {
    if (!hasPrompts) {
      toast.error('No prompts found. Add prompts first before collecting responses.');
      return;
    }

    setIsCollecting(true);
    toast.info(`Starting collection for ${promptCount} prompts...`, {
      description: 'This may take a few minutes depending on the number of prompts.',
    });

    try {
      const response = await fetch('/api/collect-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: brandId }),
      });

      if (!response.ok) {
        throw new Error('Collection failed');
      }

      const result = await response.json();

      // Invalidate the responses query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['responses'] });

      toast.success('Response collection complete!', {
        description: `Collected ${result.results.responsessSaved} responses from ${result.results.processed} prompts.`,
      });
    } catch (error) {
      console.error('Collection error:', error);
      toast.error('Failed to collect responses. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const filteredResponses = useMemo(() => {
    if (!responses) return [];

    return responses.filter((r: ResponseWithPrompt) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const promptText = r.prompt?.prompt_text || '';
        if (!r.response_text.toLowerCase().includes(query) &&
            !promptText.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Model filter
      if (modelFilter !== 'all' && r.ai_model !== modelFilter) {
        return false;
      }

      // Sentiment filter
      if (sentimentFilter !== 'all') {
        const score = r.sentiment_score;
        if (sentimentFilter === 'positive' && (score === null || score < 0.7)) return false;
        if (sentimentFilter === 'neutral' && (score === null || score < 0.4 || score >= 0.7)) return false;
        if (sentimentFilter === 'negative' && (score === null || score >= 0.4)) return false;
      }

      // Tab filter
      switch (activeTab) {
        case 'mentions':
          if (!r.mentions_brand) return false;
          break;
        case 'citations':
          if (!r.cites_domain) return false;
          break;
        case 'featured':
          if (!r.is_featured) return false;
          break;
      }

      return true;
    });
  }, [responses, searchQuery, modelFilter, sentimentFilter, activeTab]);

  // Count for tab badges
  const counts = useMemo(() => {
    if (!responses) return { all: 0, mentions: 0, citations: 0, featured: 0 };
    return {
      all: responses.length,
      mentions: responses.filter(r => r.mentions_brand).length,
      citations: responses.filter(r => r.cites_domain).length,
      featured: responses.filter(r => r.is_featured).length,
    };
  }, [responses]);

  const ResponseCard = ({ response }: { response: ResponseWithPrompt }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-medium">
              {response.prompt?.prompt_text || 'Unknown prompt'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant="outline"
                style={{
                  borderColor: AI_MODEL_COLORS[response.ai_model as AIModel],
                  color: AI_MODEL_COLORS[response.ai_model as AIModel],
                }}
              >
                {AI_MODEL_LABELS[response.ai_model as AIModel]}
              </Badge>
              <span>{formatDate(response.collected_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {response.mentions_brand && (
              <Badge variant="secondary">Mentioned</Badge>
            )}
            {response.cites_domain && (
              <Badge variant="secondary">Cited</Badge>
            )}
            {response.is_featured && (
              <Badge>Featured</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {response.response_text}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSentimentIcon(response.sentiment_score)}
              <span className="text-sm text-muted-foreground">
                Sentiment: {response.sentiment_score !== null
                  ? `${(response.sentiment_score * 100).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
            <Button variant="ghost" size="sm">
              View Full Response
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Responses</h1>
          <p className="text-muted-foreground">
            View AI responses collected from your prompts
          </p>
        </div>
        <Button
          onClick={handleCollectResponses}
          disabled={isCollecting || !hasPrompts}
          size="lg"
        >
          {isCollecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Collecting...
            </>
          ) : responses && responses.length > 0 ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Responses
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Collect Responses
            </>
          )}
        </Button>
      </div>

      {!hasPrompts && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">No prompts configured</p>
          <p className="text-amber-600 dark:text-amber-500 mt-1">
            Add prompts in the Prompts tab before collecting AI responses.
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search responses..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="AI Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {AI_MODELS.map(model => (
              <SelectItem key={model} value={model}>
                {AI_MODEL_LABELS[model]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentimentFilter} onValueChange={(v) => setSentimentFilter(v as SentimentFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All Responses
            <Badge variant="secondary" className="text-xs">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="mentions" className="gap-2">
            With Mentions
            <Badge variant="secondary" className="text-xs">{counts.mentions}</Badge>
          </TabsTrigger>
          <TabsTrigger value="citations" className="gap-2">
            With Citations
            <Badge variant="secondary" className="text-xs">{counts.citations}</Badge>
          </TabsTrigger>
          <TabsTrigger value="featured" className="gap-2">
            Featured
            <Badge variant="secondary" className="text-xs">{counts.featured}</Badge>
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filteredResponses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No responses found matching your filters
              </div>
            ) : (
              filteredResponses.map((response) => (
                <ResponseCard key={response.id} response={response} />
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
