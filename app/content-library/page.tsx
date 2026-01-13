'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  FileText,
  Plus,
  Loader2,
  Eye,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react'
import {
  useGeneratedContent,
  useContentStats,
  useDeleteContent,
  useUpdateContentStatus,
} from '@/hooks'
import {
  CONTENT_TYPES,
  CONTENT_STATUS_LABELS,
  type ContentType,
  type ContentStatus,
  type GeneratedContent,
} from '@/lib/types'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusIcon(status: ContentStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'generating':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'draft':
      return <Clock className="h-4 w-4 text-yellow-600" />
    case 'published':
      return <CheckCircle className="h-4 w-4 text-primary" />
    default:
      return null
  }
}

function getStatusBadgeVariant(status: ContentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
    case 'published':
      return 'default'
    case 'generating':
    case 'draft':
      return 'secondary'
    case 'failed':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function ContentLibraryPage() {
  const { data: content, isLoading } = useGeneratedContent()
  const { data: stats } = useContentStats()
  const deleteContent = useDeleteContent()
  const updateStatus = useUpdateContentStatus()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedContent, setSelectedContent] = useState<(GeneratedContent & { prompt?: { prompt_text: string } | null }) | null>(null)
  const [copied, setCopied] = useState(false)

  const filteredContent = useMemo(() => {
    if (!content) return []

    return content.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!item.title.toLowerCase().includes(query) &&
            !item.content.toLowerCase().includes(query)) {
          return false
        }
      }

      // Type filter
      if (typeFilter !== 'all' && item.content_type !== typeFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [content, searchQuery, typeFilter, statusFilter])

  const handleCopyContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      await deleteContent.mutateAsync(id)
      setSelectedContent(null)
    }
  }

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    await updateStatus.mutateAsync({ id, status })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Manage your AI-generated content
          </p>
        </div>
        <Button asChild>
          <Link href="/create-content">
            <Plus className="mr-2 h-4 w-4" />
            Create Content
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Content
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              pieces generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Word Count
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgWordCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              words per article
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. SEO Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgSeoScore || 0}%</div>
            <p className="text-xs text-muted-foreground">
              optimization score
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byStatus?.published || 0}</div>
            <p className="text-xs text-muted-foreground">
              articles published
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No content found</p>
              <p className="text-sm">
                {content?.length === 0
                  ? 'Generate your first piece of content'
                  : 'Try adjusting your filters'}
              </p>
              <Button asChild className="mt-4">
                <Link href="/create-content">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Content
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>SEO Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[300px]">
                      <span className="line-clamp-1 font-medium">{item.title}</span>
                      {item.prompt && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {item.prompt.prompt_text}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CONTENT_TYPES.find(t => t.value === item.content_type)?.label || item.content_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {CONTENT_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{item.word_count.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.seo_score !== undefined ? (
                        <span className={item.seo_score >= 70 ? 'text-green-600' : item.seo_score >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          {item.seo_score}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedContent(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Content Preview Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedContent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedContent.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {CONTENT_TYPES.find(t => t.value === selectedContent.content_type)?.label}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(selectedContent.status)}>
                      {CONTENT_STATUS_LABELS[selectedContent.status]}
                    </Badge>
                    <span className="text-sm">{selectedContent.word_count} words</span>
                    {selectedContent.seo_score !== undefined && (
                      <span className="text-sm">SEO: {selectedContent.seo_score}%</span>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Meta Description */}
                {selectedContent.meta_description && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
                    <p className="text-sm">{selectedContent.meta_description}</p>
                  </div>
                )}

                {/* Keywords */}
                {selectedContent.target_keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Target Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.target_keywords.map(keyword => (
                        <Badge key={keyword} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {selectedContent.content}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedContent.status}
                      onValueChange={(v) => handleStatusChange(selectedContent.id, v as ContentStatus)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleCopyContent(selectedContent.content)}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Content
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(selectedContent.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
