'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ArrowUpDown, Filter, X } from 'lucide-react'
import type { LaunchpadFilters as Filters, LaunchpadSource } from '@/lib/types'
import { LAUNCHPAD_SOURCE_LABELS } from '@/lib/types'

interface LaunchpadFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function LaunchpadFilters({ filters, onFiltersChange }: LaunchpadFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange({
      source: 'all',
      sortBy: 'priority',
      sortOrder: 'desc',
      contentCreated: 'all',
      search: '',
    })
  }

  const hasActiveFilters =
    filters.source !== 'all' ||
    filters.contentCreated !== 'all' ||
    filters.search.length > 0

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search opportunities..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Source Filter */}
        <Select
          value={filters.source}
          onValueChange={(value) => updateFilter('source', value as LaunchpadSource | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="answer_gap">{LAUNCHPAD_SOURCE_LABELS.answer_gap}</SelectItem>
            <SelectItem value="keyword_fueler">{LAUNCHPAD_SOURCE_LABELS.keyword_fueler}</SelectItem>
          </SelectContent>
        </Select>

        {/* Content Status Filter */}
        <Select
          value={filters.contentCreated}
          onValueChange={(value) =>
            updateFilter('contentCreated', value as 'all' | 'created' | 'pending')
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="created">Created</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            updateFilter('sortBy', value as 'priority' | 'visibility' | 'content_gap' | 'created_at')
          }
        >
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority Score</SelectItem>
            <SelectItem value="visibility">Visibility</SelectItem>
            <SelectItem value="content_gap">Content Gap</SelectItem>
            <SelectItem value="created_at">Date Added</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown
            className={`h-4 w-4 transition-transform ${
              filters.sortOrder === 'asc' ? 'rotate-180' : ''
            }`}
          />
        </Button>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
