import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ExternalLink, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AI_MODEL_LABELS, AI_MODEL_COLORS, type AIModel } from '@/lib/types'

// Placeholder data
const responses = [
  {
    id: '1',
    prompt_text: 'What are the best project management tools?',
    ai_model: 'chatgpt' as AIModel,
    response_text: 'There are several excellent project management tools available. Some of the top options include Asana for task management, Monday.com for visual workflows, Jira for software development teams, Trello for simple kanban boards, and YourBrand for comprehensive team collaboration...',
    sentiment_score: 0.8,
    mentions_brand: true,
    cites_domain: true,
    is_featured: true,
    collected_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    prompt_text: 'Compare popular CRM solutions',
    ai_model: 'claude' as AIModel,
    response_text: 'When comparing CRM solutions, it\'s important to consider factors like pricing, features, and scalability. Salesforce leads the enterprise market, while HubSpot offers a strong free tier. For mid-market companies, Pipedrive and Zoho provide excellent value...',
    sentiment_score: 0.6,
    mentions_brand: true,
    cites_domain: false,
    is_featured: false,
    collected_at: '2024-01-15T09:15:00Z',
  },
  {
    id: '3',
    prompt_text: 'Best tools for team collaboration',
    ai_model: 'gemini' as AIModel,
    response_text: 'For team collaboration, Slack remains the most popular choice for real-time communication. Microsoft Teams integrates well with Office 365 environments. Notion and Confluence are excellent for documentation and knowledge management...',
    sentiment_score: 0.4,
    mentions_brand: false,
    cites_domain: false,
    is_featured: false,
    collected_at: '2024-01-15T08:45:00Z',
  },
  {
    id: '4',
    prompt_text: 'Enterprise software recommendations',
    ai_model: 'perplexity' as AIModel,
    response_text: 'According to recent industry reports, enterprise software choices depend heavily on your specific needs. For ERP, SAP and Oracle lead the market. For project management, YourBrand has emerged as a strong contender with its AI-powered features [source: yourbrand.com]...',
    sentiment_score: 0.9,
    mentions_brand: true,
    cites_domain: true,
    is_featured: true,
    collected_at: '2024-01-15T07:20:00Z',
  },
]

function getSentimentIcon(score: number) {
  if (score >= 0.7) return <ThumbsUp className="h-4 w-4 text-green-600" />
  if (score >= 0.4) return <Minus className="h-4 w-4 text-yellow-600" />
  return <ThumbsDown className="h-4 w-4 text-red-600" />
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ResponsesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Responses</h1>
        <p className="text-muted-foreground">
          View AI responses collected from your prompts
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search responses..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="AI Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="chatgpt">ChatGPT</SelectItem>
            <SelectItem value="claude">Claude</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="perplexity">Perplexity</SelectItem>
            <SelectItem value="copilot">Copilot</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Responses</TabsTrigger>
          <TabsTrigger value="mentions">With Mentions</TabsTrigger>
          <TabsTrigger value="citations">With Citations</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4 mt-4">
          {responses.map((response) => (
            <Card key={response.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{response.prompt_text}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: AI_MODEL_COLORS[response.ai_model],
                          color: AI_MODEL_COLORS[response.ai_model],
                        }}
                      >
                        {AI_MODEL_LABELS[response.ai_model]}
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
                        Sentiment: {(response.sentiment_score * 100).toFixed(0)}%
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
          ))}
        </TabsContent>
        <TabsContent value="mentions" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Filtered responses with brand mentions will appear here
          </div>
        </TabsContent>
        <TabsContent value="citations" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Filtered responses with domain citations will appear here
          </div>
        </TabsContent>
        <TabsContent value="featured" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Featured responses will appear here
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
