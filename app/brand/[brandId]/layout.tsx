'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  LayoutDashboard,
  BookOpen,
  MonitorDot,
  MessageSquare,
  FileText,
  Link2,
  Smile,
  Target,
  Fuel,
  Rocket,
  PenTool,
  Library,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard },
  { name: 'Brand Bible', href: 'brand-bible', icon: BookOpen },
  { name: 'Monitors', href: 'monitors', icon: MonitorDot },
  { name: 'Prompts', href: 'prompts', icon: MessageSquare },
  { name: 'Responses', href: 'responses', icon: FileText },
  { name: 'Citations', href: 'citations', icon: Link2 },
  { name: 'Sentiment', href: 'sentiment', icon: Smile },
  { name: 'Answer Gaps', href: 'answer-gaps', icon: Target },
  { name: 'Keyword Fueler', href: 'keyword-fueler', icon: Fuel },
  { name: 'Launchpad', href: 'visibility-launchpad', icon: Rocket },
  { name: 'Create Content', href: 'create-content', icon: PenTool },
  { name: 'Content Library', href: 'content-library', icon: Library },
];

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const brandId = params.brandId as string;
  const [collapsed, setCollapsed] = useState(false);

  const { data: project, isLoading } = useProject(brandId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-xl font-semibold">Brand not found</div>
        <Link href="/">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand Header */}
        <div className="border-b p-4">
          {!collapsed && (
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Brands
            </Link>
          )}
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {project.tracked_brand?.charAt(0) || 'B'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{project.tracked_brand}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {project.industry || 'No industry'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navigation.map((item) => {
            const href = `/brand/${brandId}/${item.href}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');

            return (
              <Link
                key={item.name}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="border-t p-2 space-y-1">
          <Link
            href={`/brand/${brandId}/settings`}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
