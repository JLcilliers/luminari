'use client';

import { useState } from 'react';
import { useProjects, useDeleteProject, type ProjectWithStats } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Building2,
  Globe,
  ArrowRight,
  Sparkles,
  Loader2,
  MessageSquare,
  FileText,
  Target,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function BrandsPage() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<ProjectWithStats | null>(null);

  const handleDeleteBrand = (project: ProjectWithStats) => {
    setBrandToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!brandToDelete) return;

    try {
      await deleteProject.mutateAsync(brandToDelete.id);
      toast.success(`"${brandToDelete.tracked_brand}" has been deleted`);
    } catch (error) {
      toast.error('Failed to delete brand. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-primary" />
              Luminari
            </h1>
            <p className="text-muted-foreground mt-1">
              AI Visibility Monitoring Platform
            </p>
          </div>
          <Link href="/setup">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Brand
            </Button>
          </Link>
        </div>

        {/* Brand Cards Grid */}
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <BrandCard key={project.id} project={project} onDelete={handleDeleteBrand} />
            ))}

            {/* Add Brand Card */}
            <Link href="/setup">
              <Card className="border-dashed border-2 hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer h-full min-h-[200px] flex items-center justify-center">
                <CardContent className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Add New Brand</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start monitoring a new brand
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        ) : (
          /* Empty State */
          <Card className="max-w-lg mx-auto">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Brands Yet</h2>
              <p className="text-muted-foreground mb-6">
                Add your first brand to start monitoring its visibility across AI platforms.
              </p>
              <Link href="/setup">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Brand
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Brand</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{brandToDelete?.tracked_brand}</strong>?
                This will permanently remove all associated monitors, prompts, responses, and data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Brand
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface BrandCardProps {
  project: ProjectWithStats;
  onDelete: (project: ProjectWithStats) => void;
}

function BrandCard({ project, onDelete }: BrandCardProps) {
  const visibilityScore = project.health_score || 0;
  const mentionRate = project.response_count > 0
    ? Math.round((project.mention_count / project.response_count) * 100)
    : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project);
  };

  return (
    <Link href={`/brand/${project.id}/dashboard`}>
      <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{project.tracked_brand}</CardTitle>
                <CardDescription className="text-xs">
                  {project.industry || 'No industry set'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={visibilityScore > 50 ? 'default' : 'secondary'}>
                {visibilityScore > 0 ? `${visibilityScore}%` : 'New'}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Prompts
              </div>
              <span className="text-lg font-semibold">{project.prompt_count}</span>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Responses
              </div>
              <span className="text-lg font-semibold">{project.response_count}</span>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                Mentions
              </div>
              <span className="text-lg font-semibold">{mentionRate}%</span>
            </div>
          </div>

          {/* Visibility Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Visibility Score</span>
              <span className="font-medium">{visibilityScore}%</span>
            </div>
            <Progress value={visibilityScore} className="h-2" />
          </div>

          {/* Website */}
          {project.website_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span className="truncate">{project.website_url}</span>
            </div>
          )}

          {/* View Button */}
          <Button variant="outline" className="w-full">
            View Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
