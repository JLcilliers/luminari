'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, Link2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AI_MODEL_LABELS, AI_MODEL_COLORS, type AIModel } from '@/lib/types';
import { useCitations, useCitationsByDomain, useCitationStats, useResponseStats, useProject, type CitationWithResponse } from '@/hooks';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CitationsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: citations, isLoading: citationsLoading } = useCitations(brandId);
  const { data: citationsByDomain, isLoading: domainsLoading } = useCitationsByDomain(brandId);
  const { data: citationStats, isLoading: statsLoading } = useCitationStats(brandId);
  const { data: responseStats } = useResponseStats(brandId);
  const { data: project } = useProject(brandId);

  const [searchQuery, setSearchQuery] = useState('');

  const trackedDomain = project?.website_url
    ? new URL(project.website_url).hostname.replace('www.', '')
    : null;

  // Calculate your domain citations
  const yourDomainCitations = useMemo(() => {
    if (!citationsByDomain || !trackedDomain) return 0;
    const match = citationsByDomain.find(d =>
      d.domain.replace('www.', '').includes(trackedDomain)
    );
    return match?.count || 0;
  }, [citationsByDomain, trackedDomain]);

  // Calculate citation rate
  const citationRate = responseStats?.citationRate || 0;

  // Filter citations based on search
  const filteredCitations = useMemo(() => {
    if (!citations) return [];
    if (!searchQuery) return citations;

    const query = searchQuery.toLowerCase();
    return citations.filter((c: CitationWithResponse) => {
      const promptText = c.response?.prompt?.prompt_text || '';
      return (
        c.cited_domain.toLowerCase().includes(query) ||
        (c.citation_context && c.citation_context.toLowerCase().includes(query)) ||
        promptText.toLowerCase().includes(query)
      );
    });
  }, [citations, searchQuery]);

  const isLoading = citationsLoading || domainsLoading || statsLoading;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Citations</h1>
        <p className="text-muted-foreground">
          Track domain citations in AI responses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Citations
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{citationStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  All time citations tracked
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Domain Citations
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{yourDomainCitations}</div>
                <p className="text-xs text-muted-foreground">
                  {trackedDomain ? `Citations to ${trackedDomain}` : 'Configure your domain in settings'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Citation Rate
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{citationRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              of responses cite your domain
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Domains
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{citationStats?.uniqueDomains || 0}</div>
                <p className="text-xs text-muted-foreground">
                  domains cited in responses
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Citations by Domain */}
        <Card>
          <CardHeader>
            <CardTitle>Top Cited Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : citationsByDomain && citationsByDomain.length > 0 ? (
              <div className="space-y-4">
                {citationsByDomain.slice(0, 5).map((item, index) => {
                  const isTrackedDomain = trackedDomain && item.domain.replace('www.', '').includes(trackedDomain);
                  return (
                    <div key={item.domain} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <a
                          href={`https://${item.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-medium hover:underline flex items-center gap-1 ${
                            isTrackedDomain ? 'text-primary' : ''
                          }`}
                        >
                          {item.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {isTrackedDomain && (
                          <Badge variant="secondary" className="text-xs">
                            Your Domain
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No citations tracked yet</p>
                <p className="text-sm">Collect AI responses to see cited domains</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Citations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Citations</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search citations..."
                  className="pl-10 h-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {citationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCitations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCitations.slice(0, 10).map((citation: CitationWithResponse) => {
                    const aiModel = citation.response?.ai_model || 'chatgpt';

                    return (
                      <TableRow key={citation.id}>
                        <TableCell>
                          {citation.cited_url ? (
                            <a
                              href={citation.cited_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              {citation.cited_domain}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-foreground">{citation.cited_domain}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {citation.citation_context || 'No context available'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: AI_MODEL_COLORS[aiModel as AIModel],
                              color: AI_MODEL_COLORS[aiModel as AIModel],
                            }}
                          >
                            {AI_MODEL_LABELS[aiModel as AIModel]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(citation.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No citations found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'Collect AI responses to see citations'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
