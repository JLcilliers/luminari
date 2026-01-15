'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrompts, useMonitors } from '@/hooks';
import { AddPromptDialog } from '@/components/prompts';
import { ExcelUpload } from '@/components/ui/excel-upload';
import { PROMPT_COLUMNS, ParsedRow } from '@/lib/excel-utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type SortField = 'prompt_text' | 'search_volume' | 'difficulty_score' | 'visibility_pct' | 'responses';
type SortDirection = 'asc' | 'desc';

export default function PromptsPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = usePrompts(brandId);
  const { data: monitors } = useMonitors(brandId);

  const [searchQuery, setSearchQuery] = useState('');
  const [monitorFilter, setMonitorFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('visibility_pct');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get existing prompt texts for duplicate detection
  const existingPromptTexts = useMemo(() => {
    if (!prompts) return new Set<string>();
    return new Set(prompts.map(p => p.prompt_text.toLowerCase().trim()));
  }, [prompts]);

  // Handle bulk import
  const handleBulkImport = async (rows: ParsedRow[]): Promise<{ success: number; failed: number }> => {
    try {
      const response = await fetch('/api/prompts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: brandId,
          prompts: rows.map(r => r.data),
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk import failed');
      }

      const result = await response.json();

      // Refresh prompts list
      queryClient.invalidateQueries({ queryKey: ['prompts', brandId] });

      toast.success(`Successfully imported ${result.success} prompts`);
      return result;
    } catch (error) {
      toast.error('Failed to import prompts');
      throw error;
    }
  };

  // Transform and filter data
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];

    return prompts
      .map(p => ({
        ...p,
        responses_count: (p.responses as unknown[])?.length || 0,
        mention_rate: (p.responses as { mentions_brand: boolean }[])?.length > 0
          ? ((p.responses as { mentions_brand: boolean }[]).filter(r => r.mentions_brand).length /
             (p.responses as { mentions_brand: boolean }[]).length) * 100
          : 0,
      }))
      .filter(p => {
        // Search filter
        if (searchQuery && !p.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        // Monitor filter
        if (monitorFilter !== 'all' && p.monitor_id !== monitorFilter) {
          return false;
        }
        // Intent filter
        if (intentFilter !== 'all' && p.intent_type !== intentFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'prompt_text':
            comparison = a.prompt_text.localeCompare(b.prompt_text);
            break;
          case 'search_volume':
            comparison = (a.search_volume || 0) - (b.search_volume || 0);
            break;
          case 'difficulty_score':
            comparison = (a.difficulty_score || 0) - (b.difficulty_score || 0);
            break;
          case 'visibility_pct':
            comparison = (a.visibility_pct || 0) - (b.visibility_pct || 0);
            break;
          case 'responses':
            comparison = a.responses_count - b.responses_count;
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [prompts, searchQuery, monitorFilter, intentFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '—';
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground">
            Manage prompts used to query AI models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelUpload
            columns={PROMPT_COLUMNS}
            onImport={handleBulkImport}
            templateName="prompts-template"
            title="Bulk Import Prompts"
            description="Upload an Excel or CSV file to import multiple prompts at once."
            uniqueKey="prompt_text"
            existingValues={existingPromptTexts}
            trigger={
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload Excel
              </Button>
            }
          />
          <AddPromptDialog projectId={brandId} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={monitorFilter} onValueChange={setMonitorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by monitor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Monitors</SelectItem>
            {monitors?.map(monitor => (
              <SelectItem key={monitor.id} value={monitor.id}>
                {monitor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Intent type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="organic">Organic</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[350px]">
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('prompt_text')}
                  >
                    Prompt
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Monitor</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('search_volume')}
                  >
                    Vol.
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('difficulty_score')}
                  >
                    Diff.
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('visibility_pct')}
                  >
                    Visibility
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('responses')}
                  >
                    Responses
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No prompts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrompts.map((prompt) => (
                  <TableRow key={prompt.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <span className="line-clamp-1">{prompt.prompt_text}</span>
                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex gap-1">
                            {prompt.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {prompt.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{prompt.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(prompt.monitor as { name: string } | null)?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={prompt.intent_type === 'commercial' ? 'default' : 'secondary'}>
                        {prompt.intent_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVolume(prompt.search_volume)}
                    </TableCell>
                    <TableCell className="text-right">
                      {prompt.difficulty_score ? (
                        <span className={
                          prompt.difficulty_score < 0.4 ? 'text-green-600' :
                          prompt.difficulty_score < 0.7 ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {(prompt.difficulty_score * 100).toFixed(0)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {prompt.visibility_pct ? (
                        <span className={prompt.visibility_pct >= 50 ? 'text-green-600' : 'text-muted-foreground'}>
                          {prompt.visibility_pct.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span>{prompt.responses_count}</span>
                        {prompt.responses_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {prompt.mention_rate.toFixed(0)}% mention
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
