import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CrawlStats } from '@/lib/types';

interface WebsiteAnalysisRequest {
  websiteUrl: string;
  brandName: string;
}

interface WebsiteAnalysisResponse {
  success: boolean;
  brandBible: BrandBible;
  crawlStats?: CrawlStats;
}

interface BrandBible {
  name: string;
  tracked_brand: string;
  website_url: string;
  industry: string;
  sub_industry?: string;
  description: string;
  target_audience: string;
  secondary_audiences?: string[];
  brand_voice: string;
  tone_guidelines: string;
  key_differentiators: string[];
  key_messages: string[];
  important_keywords: string[];
  content_pillars: string[];
  unique_selling_points: string[];
  products_services?: string[];
  pricing_model?: string;
  avoid_topics: string[];
  competitors: string[];
  brand_personality_traits?: string[];
  customer_pain_points?: string[];
  proof_points?: string[];
}

export function useAnalyzeWebsite() {
  return useMutation({
    mutationFn: async (request: WebsiteAnalysisRequest): Promise<WebsiteAnalysisResponse> => {
      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      return response.json();
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brandBible: BrandBible) => {
      // Extract competitors to create separately
      const { competitors, ...projectData } = brandBible;

      // Create the project with all Brand Bible fields
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          tracked_brand: projectData.tracked_brand,
          website_url: projectData.website_url,
          industry: projectData.industry,
          description: projectData.description,
          target_audience: projectData.target_audience,
          brand_voice: projectData.brand_voice,
          tone_guidelines: projectData.tone_guidelines,
          key_differentiators: projectData.key_differentiators,
          key_messages: projectData.key_messages,
          important_keywords: projectData.important_keywords,
          content_pillars: projectData.content_pillars,
          unique_selling_points: projectData.unique_selling_points,
          avoid_topics: projectData.avoid_topics,
          // Extended fields
          sub_industry: projectData.sub_industry,
          secondary_audiences: projectData.secondary_audiences,
          products_services: projectData.products_services,
          pricing_model: projectData.pricing_model,
          brand_personality_traits: projectData.brand_personality_traits,
          customer_pain_points: projectData.customer_pain_points,
          proof_points: projectData.proof_points,
        } as never)
        .select()
        .single();

      if (projectError) throw projectError;

      // Create competitors
      if (competitors && competitors.length > 0) {
        const competitorRecords = competitors.map((name: string) => ({
          project_id: (project as { id: string }).id,
          name,
        }));

        await supabase.from('competitors').insert(competitorRecords as never);
      }

      // Create a default monitor
      const { data: monitor } = await supabase
        .from('monitors')
        .insert({
          project_id: (project as { id: string }).id,
          name: `${projectData.tracked_brand} Monitor`,
          language: 'English',
          location: 'United States',
          ai_models: ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot'],
          is_active: true,
        } as never)
        .select()
        .single();

      return { project, monitor };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
  });
}

export function useHasProject() {
  return useMutation({
    mutationFn: async () => {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      return (count || 0) > 0;
    },
  });
}
