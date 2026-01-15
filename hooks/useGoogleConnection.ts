'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GSCProperty, GA4Account, GSCKeywordData } from '@/lib/types'

interface GoogleConnectionData {
  connection: {
    id: string
    email: string
    gsc_property: string | null
    ga4_property: string | null
    connected_at: string
  } | null
  gscProperties: GSCProperty[]
  ga4Properties: GA4Account[]
}

interface GSCData {
  keywords: GSCKeywordData[]
  dateRange: {
    start: string
    end: string
  }
  property: string
}

// Fetch Google connection status and properties
export function useGoogleConnection(projectId: string) {
  return useQuery<GoogleConnectionData>({
    queryKey: ['google-connection', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/google/properties?projectId=${projectId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return { connection: null, gscProperties: [], ga4Properties: [] }
        }
        throw new Error('Failed to fetch Google connection')
      }
      return response.json()
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  })
}

// Update selected properties
export function useUpdateGoogleProperties() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      gscProperty,
      ga4Property,
    }: {
      projectId: string
      gscProperty?: string | null
      ga4Property?: string | null
    }) => {
      const response = await fetch('/api/google/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, gscProperty, ga4Property }),
      })
      if (!response.ok) throw new Error('Failed to update properties')
      return response.json()
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['google-connection', projectId] })
    },
  })
}

// Disconnect Google account
export function useDisconnectGoogle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (!response.ok) throw new Error('Failed to disconnect Google')
      return response.json()
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['google-connection', projectId] })
    },
  })
}

// Fetch GSC keywords
export function useGSCKeywords(projectId: string, enabled: boolean = true) {
  return useQuery<GSCData>({
    queryKey: ['gsc-keywords', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/google/gsc?projectId=${projectId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to fetch GSC keywords'
        console.error('[useGSCKeywords] Error:', errorMessage, errorData)
        throw new Error(errorMessage)
      }
      return response.json()
    },
    enabled: enabled && !!projectId,
    staleTime: 300000, // 5 minutes
    retry: false, // Don't retry on failure for better UX
  })
}

// Import GSC keywords
export function useImportGSCKeywords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      keywords,
    }: {
      projectId: string
      keywords: GSCKeywordData[]
    }) => {
      const response = await fetch('/api/google/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, keywords }),
      })
      if (!response.ok) throw new Error('Failed to import GSC keywords')
      return response.json()
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
      queryClient.invalidateQueries({ queryKey: ['gsc-keywords', projectId] })
    },
  })
}

// GSC Pages data interface
interface GSCPagesData {
  pages: {
    url: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }[]
  dateRange: {
    start: string
    end: string
  }
  property: string
}

// Fetch GSC pages
export function useGSCPages(projectId: string, days: number = 28, enabled: boolean = true) {
  return useQuery<GSCPagesData>({
    queryKey: ['gsc-pages', projectId, days],
    queryFn: async () => {
      const response = await fetch(`/api/google/gsc/pages?projectId=${projectId}&days=${days}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to fetch GSC pages'
        console.error('[useGSCPages] Error:', errorMessage, errorData)
        throw new Error(errorMessage)
      }
      return response.json()
    },
    enabled: enabled && !!projectId,
    staleTime: 300000, // 5 minutes
    retry: false, // Don't retry on failure for better UX
  })
}

// GA4 Overview data interface
interface GA4OverviewData {
  overview: {
    sessions: number
    users: number
    pageviews: number
    bounceRate: number
    avgSessionDuration: number
  }
  dailyData: {
    date: string
    sessions: number
    users: number
  }[]
  trafficSources: {
    source: string
    sessions: number
  }[]
  topPages: {
    page: string
    sessions: number
    users: number
    bounceRate: number
  }[]
  dateRange: {
    start: string
    end: string
  }
  property: string
}

// Fetch GA4 overview
export function useGA4Overview(projectId: string, days: number = 28, enabled: boolean = true) {
  return useQuery<GA4OverviewData>({
    queryKey: ['ga4-overview', projectId, days],
    queryFn: async () => {
      const response = await fetch(`/api/google/ga4?projectId=${projectId}&days=${days}`)
      if (!response.ok) throw new Error('Failed to fetch GA4 data')
      return response.json()
    },
    enabled: enabled && !!projectId,
    staleTime: 300000, // 5 minutes
  })
}
