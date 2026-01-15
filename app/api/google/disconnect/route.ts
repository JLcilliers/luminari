import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Delete Google connection for this project
    // Note: Using type assertion since google_connections table may not be in generated types yet
    const { error } = await supabase
      .from('google_connections' as 'projects')
      .delete()
      .eq('project_id' as 'id', projectId)

    if (error) {
      console.error('Failed to disconnect Google:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect Google account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    )
  }
}
