import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Placeholder data
const prompts = [
  {
    id: '1',
    prompt_text: 'What are the best project management tools for remote teams?',
    monitor_name: 'Product Reviews Monitor',
    intent_type: 'commercial' as const,
    tags: ['product', 'comparison'],
    responses_count: 25,
    mentions_rate: 68,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    prompt_text: 'How do I improve team productivity?',
    monitor_name: 'Industry Trends',
    intent_type: 'organic' as const,
    tags: ['productivity', 'tips'],
    responses_count: 18,
    mentions_rate: 45,
    created_at: '2024-01-14',
  },
  {
    id: '3',
    prompt_text: 'Compare top CRM solutions for small businesses',
    monitor_name: 'Competitor Analysis',
    intent_type: 'commercial' as const,
    tags: ['crm', 'comparison', 'small-business'],
    responses_count: 32,
    mentions_rate: 72,
    created_at: '2024-01-12',
  },
  {
    id: '4',
    prompt_text: 'Best practices for customer onboarding',
    monitor_name: 'Product Reviews Monitor',
    intent_type: 'organic' as const,
    tags: ['onboarding', 'best-practices'],
    responses_count: 14,
    mentions_rate: 35,
    created_at: '2024-01-10',
  },
  {
    id: '5',
    prompt_text: 'Which analytics tool should I use for my SaaS?',
    monitor_name: 'Competitor Analysis',
    intent_type: 'commercial' as const,
    tags: ['analytics', 'saas'],
    responses_count: 22,
    mentions_rate: 58,
    created_at: '2024-01-08',
  },
]

export default function PromptsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground">
            Manage prompts used to query AI models
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Prompt
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search prompts..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by monitor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Monitors</SelectItem>
            <SelectItem value="product-reviews">Product Reviews</SelectItem>
            <SelectItem value="competitor">Competitor Analysis</SelectItem>
            <SelectItem value="industry">Industry Trends</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Prompt</TableHead>
              <TableHead>Monitor</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead className="text-right">Mention Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((prompt) => (
              <TableRow key={prompt.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">
                  <span className="line-clamp-1">{prompt.prompt_text}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {prompt.monitor_name}
                </TableCell>
                <TableCell>
                  <Badge variant={prompt.intent_type === 'commercial' ? 'default' : 'secondary'}>
                    {prompt.intent_type}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-right">{prompt.responses_count}</TableCell>
                <TableCell className="text-right">
                  <span className={prompt.mentions_rate >= 50 ? 'text-green-600' : 'text-muted-foreground'}>
                    {prompt.mentions_rate}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
