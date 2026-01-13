import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Keyword,
  KeywordCartItem,
  CompetitorDomain,
  KeywordSource,
  KeywordAnalysisRequest,
  KeywordAnalysisResponse,
} from '@/lib/types'

// Fetch keywords by project and optionally by source
export function useKeywords(projectId?: string, source?: KeywordSource) {
  return useQuery({
    queryKey: ['keywords', projectId, source],
    queryFn: async () => {
      let query = supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId!)
        .order('opportunity_score', { ascending: false })

      if (source) {
        query = query.eq('source', source)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Keyword[]
    },
    enabled: !!projectId,
  })
}

// Fetch keyword cart items with keyword details
export function useKeywordCart(projectId?: string) {
  return useQuery({
    queryKey: ['keyword-cart', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_cart')
        .select(`
          *,
          keyword:keywords(*)
        `)
        .eq('project_id', projectId!)
        .order('added_at', { ascending: false })

      if (error) throw error
      return data as (KeywordCartItem & { keyword: Keyword })[]
    },
    enabled: !!projectId,
  })
}

// Add keyword to cart
export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, keywordId }: { projectId: string; keywordId: string }) => {
      // Add to cart table
      const { error: cartError } = await supabase
        .from('keyword_cart')
        .insert({ project_id: projectId, keyword_id: keywordId } as never)

      if (cartError && !cartError.message.includes('duplicate')) throw cartError

      // Update in_cart flag on keyword
      const { data, error } = await supabase
        .from('keywords')
        .update({ in_cart: true } as never)
        .eq('id', keywordId)
        .select()
        .single()

      if (error) throw error
      return data as Keyword
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
    },
  })
}

// Remove keyword from cart
export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, keywordId }: { projectId: string; keywordId: string }) => {
      // Remove from cart table
      const { error: cartError } = await supabase
        .from('keyword_cart')
        .delete()
        .eq('project_id', projectId)
        .eq('keyword_id', keywordId)

      if (cartError) throw cartError

      // Update in_cart flag on keyword
      const { data, error } = await supabase
        .from('keywords')
        .update({ in_cart: false } as never)
        .eq('id', keywordId)
        .select()
        .single()

      if (error) throw error
      return data as Keyword
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
    },
  })
}

// Clear entire cart
export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Get all cart items first
      const { data: cartItems } = await supabase
        .from('keyword_cart')
        .select('keyword_id')
        .eq('project_id', projectId) as { data: { keyword_id: string }[] | null }

      if (cartItems && cartItems.length > 0) {
        const keywordIds = cartItems.map((item) => item.keyword_id)

        // Update all keywords to remove in_cart flag
        await supabase
          .from('keywords')
          .update({ in_cart: false } as never)
          .in('id', keywordIds)
      }

      // Clear the cart
      const { error } = await supabase
        .from('keyword_cart')
        .delete()
        .eq('project_id', projectId)

      if (error) throw error
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', projectId] })
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}

// Send cart items to launchpad (mark as sent)
export function useSendToLaunchpad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Get all cart items
      const { data: cartItems } = await supabase
        .from('keyword_cart')
        .select('keyword_id')
        .eq('project_id', projectId) as { data: { keyword_id: string }[] | null }

      if (!cartItems || cartItems.length === 0) {
        throw new Error('No items in cart')
      }

      const keywordIds = cartItems.map((item) => item.keyword_id)

      // Mark keywords as sent to launchpad and remove from cart
      const { error } = await supabase
        .from('keywords')
        .update({
          sent_to_launchpad: true,
          in_cart: false,
        } as never)
        .in('id', keywordIds)

      if (error) throw error

      // Clear the cart
      await supabase
        .from('keyword_cart')
        .delete()
        .eq('project_id', projectId)

      return keywordIds.length
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', projectId] })
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] })
    },
  })
}

// Add a manual keyword
export function useAddKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      keyword,
      source = 'manual',
    }: {
      projectId: string
      keyword: string
      source?: KeywordSource
    }) => {
      const { data, error } = await supabase
        .from('keywords')
        .insert({
          project_id: projectId,
          keyword,
          source,
          content_gap_pct: 100,
          opportunity_score: 50,
          in_cart: false,
          sent_to_launchpad: false,
          content_created: false,
        } as never)
        .select()
        .single()

      if (error) throw error
      return data as Keyword
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
    },
  })
}

// Delete a keyword
export function useDeleteKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, keywordId }: { projectId: string; keywordId: string }) => {
      const { error } = await supabase
        .from('keywords')
        .delete()
        .eq('id', keywordId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', variables.projectId] })
    },
  })
}

// Fetch competitor domains
export function useCompetitorDomains(projectId?: string) {
  return useQuery({
    queryKey: ['competitor-domains', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_domains')
        .select('*')
        .eq('project_id', projectId!)
        .order('added_at', { ascending: false })

      if (error) throw error
      return data as CompetitorDomain[]
    },
    enabled: !!projectId,
  })
}

// Add competitor domain
export function useAddCompetitorDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, domain }: { projectId: string; domain: string }) => {
      // Normalize domain
      const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

      const { data, error } = await supabase
        .from('competitor_domains')
        .insert({
          project_id: projectId,
          domain: normalizedDomain,
          keywords_found: 0,
        } as never)
        .select()
        .single()

      if (error) throw error
      return data as CompetitorDomain
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-domains', variables.projectId] })
    },
  })
}

// Delete competitor domain
export function useDeleteCompetitorDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, domainId }: { projectId: string; domainId: string }) => {
      const { error } = await supabase
        .from('competitor_domains')
        .delete()
        .eq('id', domainId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-domains', variables.projectId] })
    },
  })
}

// Analyze keywords (calls API endpoint)
export function useAnalyzeKeywords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: KeywordAnalysisRequest): Promise<KeywordAnalysisResponse> => {
      const response = await fetch('/api/keywords/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze keywords')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
      if (variables.type === 'compete') {
        queryClient.invalidateQueries({ queryKey: ['competitor-domains', variables.projectId] })
      }
    },
  })
}

// Bulk add keywords to cart
export function useBulkAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, keywordIds }: { projectId: string; keywordIds: string[] }) => {
      // Add all to cart
      const cartInserts = keywordIds.map((keyword_id) => ({
        project_id: projectId,
        keyword_id,
      }))

      const { error: cartError } = await supabase
        .from('keyword_cart')
        .upsert(cartInserts as never, { onConflict: 'project_id,keyword_id' })

      if (cartError) throw cartError

      // Update in_cart flag on all keywords
      const { error } = await supabase
        .from('keywords')
        .update({ in_cart: true } as never)
        .in('id', keywordIds)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keyword-cart', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.projectId] })
    },
  })
}

// Get keywords sent to launchpad (for integration)
export function useLaunchpadKeywords(projectId?: string) {
  return useQuery({
    queryKey: ['launchpad-keywords', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId!)
        .eq('sent_to_launchpad', true)
        .eq('content_created', false)
        .order('opportunity_score', { ascending: false })

      if (error) throw error
      return data as Keyword[]
    },
    enabled: !!projectId,
  })
}
