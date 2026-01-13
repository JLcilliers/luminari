import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, ExternalLink, TrendingUp, Link2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AI_MODEL_LABELS, AI_MODEL_COLORS, type AIModel } from '@/lib/types'

// Placeholder data for citations by domain
const citationsByDomain = [
  { domain: 'yourbrand.com', count: 42, trend: '+15%' },
  { domain: 'competitor-a.com', count: 38, trend: '+8%' },
  { domain: 'competitor-b.com', count: 25, trend: '-3%' },
  { domain: 'industry-blog.com', count: 18, trend: '+22%' },
  { domain: 'techreviews.io', count: 12, trend: '+5%' },
]

// Placeholder data for recent citations
const recentCitations = [
  {
    id: '1',
    cited_domain: 'yourbrand.com',
    cited_url: 'https://yourbrand.com/features/collaboration',
    citation_context: 'According to YourBrand, effective team collaboration requires...',
    ai_model: 'perplexity' as AIModel,
    prompt_text: 'Best practices for team collaboration',
    created_at: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    cited_domain: 'yourbrand.com',
    cited_url: 'https://yourbrand.com/blog/productivity-tips',
    citation_context: 'A recent study by YourBrand found that teams using integrated tools...',
    ai_model: 'chatgpt' as AIModel,
    prompt_text: 'How to improve team productivity',
    created_at: '2024-01-15T12:15:00Z',
  },
  {
    id: '3',
    cited_domain: 'competitor-a.com',
    cited_url: 'https://competitor-a.com/resources/guide',
    citation_context: 'Competitor A recommends starting with a clear project scope...',
    ai_model: 'claude' as AIModel,
    prompt_text: 'Project management best practices',
    created_at: '2024-01-15T10:45:00Z',
  },
  {
    id: '4',
    cited_domain: 'industry-blog.com',
    cited_url: 'https://industry-blog.com/2024/trends',
    citation_context: 'Industry experts predict that AI-powered tools will dominate...',
    ai_model: 'gemini' as AIModel,
    prompt_text: 'Software industry trends 2024',
    created_at: '2024-01-15T09:20:00Z',
  },
]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CitationsPage() {
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
            <div className="text-2xl font-bold">135</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% from last week
            </p>
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
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              +15% from last week
            </p>
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
            <div className="text-2xl font-bold">31%</div>
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
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">
              domains cited this week
            </p>
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
            <div className="space-y-4">
              {citationsByDomain.map((item, index) => (
                <div key={item.domain} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.count}</span>
                    <Badge
                      variant={item.trend.startsWith('+') ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.trend}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Citations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Citations</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search citations..." className="pl-10 h-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                {recentCitations.map((citation) => (
                  <TableRow key={citation.id}>
                    <TableCell>
                      <a
                        href={citation.cited_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {citation.cited_domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {citation.citation_context}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: AI_MODEL_COLORS[citation.ai_model],
                          color: AI_MODEL_COLORS[citation.ai_model],
                        }}
                      >
                        {AI_MODEL_LABELS[citation.ai_model]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(citation.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
