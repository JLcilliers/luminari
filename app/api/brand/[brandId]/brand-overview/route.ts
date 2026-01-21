/**
 * GET /api/brand/[brandId]/brand-overview
 *
 * Returns the brand overview for a project, including:
 * - status (PENDING, RUNNING, COMPLETE, FAILED)
 * - summary_md (markdown content when complete)
 * - warnings (non-fatal issues)
 * - error (failure message)
 * - updated_at (last update timestamp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBrandOverview } from '@/lib/brand-overview/generate';

export async function GET(
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

    const overview = await getBrandOverview(brandId);

    if (!overview) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          message: 'No brand overview found. Trigger generation to create one.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: overview.id,
        project_id: overview.project_id,
        status: overview.status,
        summary_md: overview.summary_md,
        raw_json: overview.raw_json,
        warnings: overview.warnings,
        error: overview.error,
        created_at: overview.created_at,
        updated_at: overview.updated_at,
      },
    });
  } catch (error) {
    console.error('[BrandOverview API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve brand overview',
      },
      { status: 500 }
    );
  }
}
