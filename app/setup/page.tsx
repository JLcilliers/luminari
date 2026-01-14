'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalyzeWebsite, useCreateProject } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Globe, Building, ArrowRight, Check, Pencil, X, Circle, FileText, Search, Brain } from 'lucide-react';
import type { CrawlStats } from '@/lib/types';

type Step = 'input' | 'analyzing' | 'review' | 'creating';

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

export default function SetupPage() {
  const router = useRouter();
  const analyzeWebsite = useAnalyzeWebsite();
  const createProject = useCreateProject();

  const [step, setStep] = useState<Step>('input');
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandBible, setBrandBible] = useState<BrandBible | null>(null);
  const [crawlStats, setCrawlStats] = useState<CrawlStats | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!brandName || !websiteUrl) return;

    // Normalize URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setStep('analyzing');
    setError(null);

    try {
      const result = await analyzeWebsite.mutateAsync({
        brandName,
        websiteUrl: normalizedUrl,
      });
      setBrandBible(result.brandBible);
      setCrawlStats(result.crawlStats || null);
      setStep('review');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setStep('input');
    }
  };

  const handleCreate = async () => {
    if (!brandBible) return;

    setStep('creating');
    setError(null);

    try {
      const result = await createProject.mutateAsync(brandBible);
      // Redirect to the brand-scoped dashboard
      const projectId = (result.project as { id: string }).id;
      router.push(`/brand/${projectId}/dashboard`);
    } catch (err) {
      console.error('Create failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
      setStep('review');
    }
  };

  const updateField = (field: string, value: string | string[]) => {
    if (brandBible) {
      setBrandBible({ ...brandBible, [field]: value });
    }
    setEditingField(null);
  };

  const renderArrayField = (field: keyof BrandBible, label: string) => {
    if (!brandBible) return null;
    const values = (brandBible[field] as string[]) || [];
    const isEditing = editingField === field;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingField(isEditing ? null : field)}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </div>
        {isEditing ? (
          <Textarea
            value={values.join('\n')}
            onChange={(e) => updateField(field, e.target.value.split('\n').filter(Boolean))}
            rows={4}
            placeholder="One item per line"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {values.map((item: string, i: number) => (
              <Badge key={i} variant="secondary">{item}</Badge>
            ))}
            {values.length === 0 && (
              <span className="text-sm text-muted-foreground">No items added</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Step 1: Input
  if (step === 'input') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Luminari</CardTitle>
            <CardDescription>
              Let's set up AI visibility monitoring for your brand. Enter your brand name and website to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brand">Brand Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="brand"
                  placeholder="Acme Inc"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  placeholder="www.acme.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!brandName || !websiteUrl}
              className="w-full"
              size="lg"
            >
              Analyze Website
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We'll crawl your entire website to automatically generate your Brand Bible
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Analyzing (with deep crawl progress)
  if (step === 'analyzing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Deep Crawling {brandName}</h2>
            <p className="text-muted-foreground mb-6">
              Analyzing your entire website to understand every aspect of your business...
            </p>
            <div className="space-y-3 text-sm text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Checking for sitemap</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Discovering pages</span>
              </div>
              <div className="flex items-center gap-2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Deep crawling content (up to 200 pages)...</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Circle className="h-4 w-4" />
                <span>Extracting brand information</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Circle className="h-4 w-4" />
                <span>Generating Brand Bible</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              This may take 60-120 seconds for comprehensive analysis
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Review
  if (step === 'review' && brandBible) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Review Your Brand Bible</h1>
            <p className="text-muted-foreground">
              We've analyzed {websiteUrl} and generated your Brand Bible. Review and edit as needed.
            </p>

            {/* Crawl Stats */}
            {crawlStats && (
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {crawlStats.pagesCrawled} pages analyzed
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {crawlStats.sitemapFound ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Sitemap found
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Link discovery
                    </>
                  )}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  {(crawlStats.duration / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={brandBible.tracked_brand}
                    onChange={(e) => updateField('tracked_brand', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={brandBible.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                  />
                </div>
              </div>
              {brandBible.sub_industry && (
                <div className="space-y-2">
                  <Label>Sub-Industry</Label>
                  <Input
                    value={brandBible.sub_industry}
                    onChange={(e) => updateField('sub_industry', e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={brandBible.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>
              {brandBible.pricing_model && (
                <div className="space-y-2">
                  <Label>Pricing Model</Label>
                  <Input
                    value={brandBible.pricing_model}
                    onChange={(e) => updateField('pricing_model', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products & Services */}
          {brandBible.products_services && brandBible.products_services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Products & Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderArrayField('products_services', 'Offerings')}
              </CardContent>
            </Card>
          )}

          {/* Voice & Tone */}
          <Card>
            <CardHeader>
              <CardTitle>Voice & Tone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Voice</Label>
                <Select
                  value={brandBible.brand_voice}
                  onValueChange={(value) => updateField('brand_voice', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone Guidelines</Label>
                <Textarea
                  value={brandBible.tone_guidelines}
                  onChange={(e) => updateField('tone_guidelines', e.target.value)}
                  rows={2}
                />
              </div>
              {brandBible.brand_personality_traits && brandBible.brand_personality_traits.length > 0 && (
                renderArrayField('brand_personality_traits', 'Brand Personality Traits')
              )}
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle>Target Audience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Audience</Label>
                <Textarea
                  value={brandBible.target_audience}
                  onChange={(e) => updateField('target_audience', e.target.value)}
                  rows={2}
                />
              </div>
              {brandBible.secondary_audiences && brandBible.secondary_audiences.length > 0 && (
                renderArrayField('secondary_audiences', 'Secondary Audiences')
              )}
              {brandBible.customer_pain_points && brandBible.customer_pain_points.length > 0 && (
                renderArrayField('customer_pain_points', 'Customer Pain Points')
              )}
            </CardContent>
          </Card>

          {/* Keywords & Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Keywords & Content Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderArrayField('important_keywords', 'Important Keywords')}
              {renderArrayField('content_pillars', 'Content Pillars')}
              {renderArrayField('key_messages', 'Key Messages')}
            </CardContent>
          </Card>

          {/* Differentiators */}
          <Card>
            <CardHeader>
              <CardTitle>Differentiators & USPs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderArrayField('key_differentiators', 'Key Differentiators')}
              {renderArrayField('unique_selling_points', 'Unique Selling Points')}
              {brandBible.proof_points && brandBible.proof_points.length > 0 && (
                renderArrayField('proof_points', 'Proof Points & Social Proof')
              )}
              {renderArrayField('avoid_topics', 'Topics to Avoid')}
            </CardContent>
          </Card>

          {/* Competitors */}
          <Card>
            <CardHeader>
              <CardTitle>Competitors</CardTitle>
              <CardDescription>
                These competitors will be tracked for comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderArrayField('competitors', 'Competitor Brands')}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep('input')}
            >
              Start Over
            </Button>
            <Button
              onClick={handleCreate}
              size="lg"
              className="min-w-[200px]"
            >
              <Check className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Creating
  if (step === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Creating Your Project</h2>
            <p className="text-muted-foreground">
              Setting up your brand monitoring dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
