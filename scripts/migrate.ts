import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log('🔄 Running Phase 4A migrations...\n')

  // Note: Complex DDL statements need to be run in Supabase SQL Editor
  // This script will verify tables exist and seed sample competitors/personas

  // Check if competitors table exists by trying to query it
  const { error: competitorsError } = await supabase
    .from('competitors')
    .select('id')
    .limit(1)

  if (competitorsError) {
    console.log('⚠️  Competitors table not found. Please run the SQL migration in Supabase SQL Editor:')
    console.log('   File: supabase/migrations/002_add_competitors_personas.sql\n')
    return
  }

  console.log('✓ Competitors table exists')

  // Check personas table
  const { error: personasError } = await supabase
    .from('personas')
    .select('id')
    .limit(1)

  if (personasError) {
    console.log('⚠️  Personas table not found. Please run the SQL migration.')
    return
  }

  console.log('✓ Personas table exists')

  // Get the project ID
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1)

  if (!projects || projects.length === 0) {
    console.log('⚠️  No projects found. Run seed.ts first.')
    return
  }

  const projectId = projects[0].id
  console.log(`\n📁 Using project: ${projects[0].name} (${projectId})\n`)

  // Seed sample competitors
  console.log('Adding sample competitors...')
  const competitors = [
    { project_id: projectId, name: 'Originality.ai', website_url: 'https://originality.ai' },
    { project_id: projectId, name: 'Semrush', website_url: 'https://semrush.com' },
    { project_id: projectId, name: 'Ahrefs', website_url: 'https://ahrefs.com' },
    { project_id: projectId, name: 'Moz', website_url: 'https://moz.com' },
  ]

  const { error: insertCompError } = await supabase
    .from('competitors')
    .upsert(competitors, { onConflict: 'id' })

  if (insertCompError) {
    console.log('  Warning:', insertCompError.message)
  } else {
    console.log('✓ Added 4 sample competitors')
  }

  // Seed sample personas
  console.log('Adding sample personas...')
  const personas = [
    {
      project_id: projectId,
      name: 'SEO Manager',
      description: 'Manages organic search strategy for mid-size companies',
      age_range: '28-40',
      traits: ['data-driven', 'technical', 'ROI-focused']
    },
    {
      project_id: projectId,
      name: 'Content Marketer',
      description: 'Creates and optimizes content for brand visibility',
      age_range: '25-35',
      traits: ['creative', 'strategic', 'trend-aware']
    },
    {
      project_id: projectId,
      name: 'Agency Owner',
      description: 'Runs digital marketing agency serving multiple clients',
      age_range: '35-50',
      traits: ['business-focused', 'efficiency-driven', 'client-centric']
    },
  ]

  const { error: insertPersonaError } = await supabase
    .from('personas')
    .upsert(personas, { onConflict: 'id' })

  if (insertPersonaError) {
    console.log('  Warning:', insertPersonaError.message)
  } else {
    console.log('✓ Added 3 sample personas')
  }

  // Update project with Brand Book info
  console.log('Updating project Brand Book...')
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      industry: 'AI/SaaS',
      description: 'Luminari helps brands monitor and optimize their visibility across AI-powered search engines and assistants.',
      key_messages: [
        'Track brand mentions across ChatGPT, Claude, Perplexity, and more',
        'Optimize for generative engine optimization (GEO)',
        'Real-time AI visibility monitoring and analytics'
      ]
    })
    .eq('id', projectId)

  if (updateError) {
    console.log('  Warning:', updateError.message)
  } else {
    console.log('✓ Updated project Brand Book')
  }

  // Update responses with brands_mentioned
  console.log('Updating responses with brands_mentioned...')

  // Get responses that mention brand
  const { data: responses } = await supabase
    .from('responses')
    .select('id, response_text, mentions_brand')

  if (responses) {
    for (const resp of responses) {
      const brands: string[] = []
      const text = resp.response_text?.toLowerCase() || ''

      if (text.includes('luminari')) brands.push('Luminari')
      if (text.includes('originality')) brands.push('Originality.ai')
      if (text.includes('semrush')) brands.push('Semrush')
      if (text.includes('hubspot')) brands.push('HubSpot')
      if (text.includes('moz')) brands.push('Moz')

      if (brands.length > 0) {
        await supabase
          .from('responses')
          .update({ brands_mentioned: brands })
          .eq('id', resp.id)
      }
    }
    console.log('✓ Updated responses with brand mentions')
  }

  // Update prompts with sample metrics
  console.log('Updating prompts with search metrics...')
  const { data: prompts } = await supabase.from('prompts').select('id')

  if (prompts) {
    for (let i = 0; i < prompts.length; i++) {
      await supabase
        .from('prompts')
        .update({
          search_volume: Math.floor(1000 + Math.random() * 9000),
          difficulty_score: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
          visibility_pct: Math.round((20 + Math.random() * 60) * 10) / 10
        })
        .eq('id', prompts[i].id)
    }
    console.log('✓ Updated prompts with search metrics')
  }

  console.log('\n✨ Migration complete!\n')
}

migrate().catch(console.error)
