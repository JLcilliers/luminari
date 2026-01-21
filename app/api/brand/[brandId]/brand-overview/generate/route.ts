/**
 * POST /api/brand/[brandId]/brand-overview/generate
 *
 * Triggers brand overview generation for a project.
 *
 * Request body (optional):
 * - force: boolean - If true, regenerate even if already complete
 *
 * Behavior:
 * - If already RUNNING: Returns 202 with current status (idempotent)
 * - If COMPLETE and force=false: Returns existing data
 * - If COMPLETE and force=true: Regenerates
 * - If FAILED/PENDING/not exists: Starts generation
 *
 * The generation runs in the request context but returns quickly
 * while the actual work continues. Use GET to poll for status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateBrandOverviewForProject, getBrandOverview } from '@/lib/brand-overview/generate';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Parse request body for options
    let force = false;
    try {
      const body = await request.json();
      force = body.force === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Get the project to verify it exists and get website URL
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, tracked_brand, website_url')
      .eq('id', brandId)
      .single();

    const project = projectData as { id: string; tracked_brand: string; website_url: string | null } | null;

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const websiteUrl = project.website_url;
    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: 'Project has no website URL configured' },
        { status: 400 }
      );
    }

    // Check if already running
    const existing = await getBrandOverview(brandId);
    if (existing?.status === 'RUNNING') {
      return NextResponse.json(
        {
          success: true,
          status: 'RUNNING',
          message: 'Generation already in progress',
          data: existing,
        },
        { status: 202 }
      );
    }

    // If complete and not forcing, return existing
    if (existing?.status === 'COMPLETE' && !force) {
      return NextResponse.json({
        success: true,
        status: 'COMPLETE',
        message: 'Brand overview already exists. Use force=true to regenerate.',
        data: existing,
      });
    }

    // Start generation (runs in background via promise, returns immediately)
    // We don't await here to make the endpoint respond quickly
    generateBrandOverviewForProject({
      projectId: brandId,
      websiteUrl: websiteUrl,
      brandName: project.tracked_brand,
      force,
    }).catch((error) => {
      // Log error but don't fail the response
      console.error('[BrandOverview Generate] Background error:', error);
    });

    // Return immediately with RUNNING status
    return NextResponse.json({
      success: true,
      status: 'RUNNING',
      message: 'Brand overview generation started. Poll GET endpoint for status.',
    });
  } catch (error) {
    console.error('[BrandOverview API] POST generate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start brand overview generation',
      },
      { status: 500 }
    );
  }
}
