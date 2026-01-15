import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BulkPromptData {
  prompt_text: string
  category?: string
  intent_type?: 'organic' | 'commercial'
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, prompts, monitorId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: 'No prompts provided' },
        { status: 400 }
      )
    }

    // Get a monitor ID to use
    let targetMonitorId = monitorId

    if (!targetMonitorId) {
      // Get the first monitor for this project
      const { data: monitors } = await supabase
        .from('monitors')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)

      if (monitors && monitors.length > 0) {
        targetMonitorId = monitors[0].id
      } else {
        // Create a default monitor if none exists
        const { data: newMonitor, error: monitorError } = await supabase
          .from('monitors')
          .insert({
            project_id: projectId,
            name: 'Default Monitor',
            language: 'en',
            location: 'US',
            ai_models: ['chatgpt', 'claude', 'gemini', 'perplexity'],
            is_active: true,
          })
          .select('id')
          .single()

        if (monitorError) {
          console.error('Failed to create default monitor:', monitorError)
          return NextResponse.json(
            { error: 'Failed to create default monitor' },
            { status: 500 }
          )
        }

        targetMonitorId = newMonitor.id
      }
    }

    // Get existing prompts to check for duplicates
    const { data: existingPrompts } = await supabase
      .from('prompts')
      .select('prompt_text')
      .eq('monitor_id', targetMonitorId)

    const existingSet = new Set(
      (existingPrompts || []).map((p: { prompt_text: string }) =>
        p.prompt_text.toLowerCase().trim()
      )
    )

    // Filter out duplicates and prepare prompts for insertion
    const promptsToInsert: Array<{
      monitor_id: string
      prompt_text: string
      intent_type: 'organic' | 'commercial'
      tags: string[]
    }> = []

    const skipped: string[] = []

    for (const prompt of prompts as BulkPromptData[]) {
      const normalizedText = prompt.prompt_text?.toLowerCase().trim()

      if (!normalizedText) {
        continue // Skip empty prompts
      }

      if (existingSet.has(normalizedText)) {
        skipped.push(prompt.prompt_text)
        continue
      }

      // Build tags from category and notes
      const tags: string[] = []
      if (prompt.category) {
        tags.push(prompt.category)
      }

      promptsToInsert.push({
        monitor_id: targetMonitorId,
        prompt_text: prompt.prompt_text.trim(),
        intent_type: prompt.intent_type || 'organic',
        tags,
      })

      // Add to set to prevent duplicates within the batch
      existingSet.add(normalizedText)
    }

    if (promptsToInsert.length === 0) {
      return NextResponse.json({
        success: 0,
        failed: 0,
        skipped: skipped.length,
        message: 'All prompts were duplicates',
      })
    }

    // Insert prompts in batches of 50
    const batchSize = 50
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < promptsToInsert.length; i += batchSize) {
      const batch = promptsToInsert.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from('prompts')
        .insert(batch)
        .select()

      if (error) {
        console.error('Batch insert error:', error)
        failedCount += batch.length
      } else {
        successCount += data?.length || 0
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      skipped: skipped.length,
      total: prompts.length,
      monitorId: targetMonitorId,
    })
  } catch (error) {
    console.error('Bulk prompts import error:', error)
    return NextResponse.json(
      { error: 'Import failed. Please try again.' },
      { status: 500 }
    )
  }
}
