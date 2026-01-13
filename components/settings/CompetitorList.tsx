'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { useCompetitors, useCreateCompetitor, useDeleteCompetitor } from '@/hooks'
import type { Competitor } from '@/lib/types'

interface CompetitorListProps {
  projectId: string
}

export function CompetitorList({ projectId }: CompetitorListProps) {
  const { data: competitors, isLoading } = useCompetitors(projectId)
  const createCompetitor = useCreateCompetitor()
  const deleteCompetitor = useDeleteCompetitor()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState({
    name: '',
    website_url: '',
  })

  const handleCreate = async () => {
    if (!newCompetitor.name.trim()) return

    await createCompetitor.mutateAsync({
      project_id: projectId,
      name: newCompetitor.name.trim(),
      website_url: newCompetitor.website_url.trim() || undefined,
    })

    setNewCompetitor({ name: '', website_url: '' })
    setIsDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this competitor?')) {
      await deleteCompetitor.mutateAsync(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Competitors
            </CardTitle>
            <CardDescription>
              Track competitor brands to compare visibility and share of voice
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Competitor</DialogTitle>
                <DialogDescription>
                  Add a competitor brand to track their AI visibility
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Competitor Name</label>
                  <Input
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Competitor Inc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL (optional)</label>
                  <Input
                    value={newCompetitor.website_url}
                    onChange={(e) => setNewCompetitor(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://competitor.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createCompetitor.isPending}>
                  {createCompetitor.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Competitor'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : competitors && competitors.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium">{competitor.name}</TableCell>
                  <TableCell>
                    {competitor.website_url ? (
                      <a
                        href={competitor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        {new URL(competitor.website_url).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(competitor.id)}
                      disabled={deleteCompetitor.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No competitors added yet</p>
            <p className="text-sm">Add competitors to track their AI visibility</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
