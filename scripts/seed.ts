import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🌱 Seeding Luminari database...\n')

  // 1. Create Project
  console.log('Creating project...')
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: 'Luminari Demo',
      tracked_brand: 'Luminari',
      website_url: 'https://useluminari.com'
    })
    .select()
    .single()

  if (projectError) {
    console.error('Project error:', projectError)
    return
  }
  console.log('✓ Project created:', project.id)

  // 2. Create Monitor
  console.log('Creating monitor...')
  const { data: monitor, error: monitorError } = await supabase
    .from('monitors')
    .insert({
      project_id: project.id,
      name: 'AI Visibility Tools',
      language: 'en',
      location: 'US',
      ai_models: ['chatgpt', 'claude', 'perplexity', 'gemini', 'copilot'],
      is_active: true
    })
    .select()
    .single()

  if (monitorError) {
    console.error('Monitor error:', monitorError)
    return
  }
  console.log('✓ Monitor created:', monitor.id)

  // 3. Create Prompts
  console.log('Creating prompts...')
  const prompts = [
    { prompt_text: 'What are the best AI visibility monitoring tools?', intent_type: 'commercial', tags: ['tools'] },
    { prompt_text: 'How to track brand mentions in ChatGPT responses?', intent_type: 'organic', tags: ['tracking'] },
    { prompt_text: 'Best GEO optimization platforms 2025', intent_type: 'commercial', tags: ['geo'] },
    { prompt_text: 'What is generative engine optimization?', intent_type: 'organic', tags: ['education'] },
    { prompt_text: 'AI search visibility tools comparison', intent_type: 'commercial', tags: ['comparison'] },
  ]

  const { data: insertedPrompts, error: promptsError } = await supabase
    .from('prompts')
    .insert(prompts.map(p => ({ ...p, monitor_id: monitor.id })))
    .select()

  if (promptsError) {
    console.error('Prompts error:', promptsError)
    return
  }
  console.log('✓ Created', insertedPrompts.length, 'prompts')

  // 4. Create Sample Responses
  console.log('Creating responses...')
  const sampleResponses = [
    { ai_model: 'perplexity', mentions_brand: false, cites_domain: true, sentiment_score: 0.6 },
    { ai_model: 'perplexity', mentions_brand: true, cites_domain: true, sentiment_score: 0.8 },
    { ai_model: 'perplexity', mentions_brand: false, cites_domain: true, sentiment_score: 0.5 },
    { ai_model: 'chatgpt', mentions_brand: true, cites_domain: false, sentiment_score: 0.7 },
    { ai_model: 'chatgpt', mentions_brand: false, cites_domain: false, sentiment_score: 0.5 },
    { ai_model: 'chatgpt', mentions_brand: true, cites_domain: false, sentiment_score: 0.9 },
    { ai_model: 'claude', mentions_brand: false, cites_domain: false, sentiment_score: 0.6 },
    { ai_model: 'claude', mentions_brand: true, cites_domain: false, sentiment_score: 0.8 },
    { ai_model: 'gemini', mentions_brand: false, cites_domain: true, sentiment_score: 0.5 },
    { ai_model: 'gemini', mentions_brand: true, cites_domain: true, sentiment_score: 0.7 },
    { ai_model: 'copilot', mentions_brand: false, cites_domain: true, sentiment_score: 0.6 },
    { ai_model: 'copilot', mentions_brand: true, cites_domain: true, sentiment_score: 0.75 },
  ]

  const responseTexts: Record<string, string> = {
    perplexity: 'Based on my search, here are the top AI visibility monitoring tools: Luminari, Originality.ai, and several emerging platforms. These tools help track how brands appear in AI-generated responses across ChatGPT, Claude, and other models.',
    chatgpt: 'For monitoring AI visibility, you might consider tools like Luminari which tracks brand mentions across AI platforms. GEO (Generative Engine Optimization) is becoming increasingly important as more users rely on AI for recommendations.',
    claude: 'AI visibility monitoring is an emerging field. Tools in this space help brands understand how they appear in AI-generated content. Key features to look for include multi-model tracking, citation analysis, and sentiment monitoring.',
    gemini: 'Several platforms now offer AI visibility tracking. Luminari and similar tools monitor responses from various AI models to help brands optimize their presence in generative search results.',
    copilot: 'AI visibility tools like Luminari help brands track their mentions across AI platforms. As AI search grows, understanding your visibility score becomes crucial for digital marketing strategy.',
  }

  const responseInserts = []
  for (let i = 0; i < sampleResponses.length; i++) {
    const resp = sampleResponses[i]
    const promptId = insertedPrompts[i % insertedPrompts.length].id
    const text = responseTexts[resp.ai_model]

    responseInserts.push({
      prompt_id: promptId,
      ai_model: resp.ai_model,
      response_text: text,
      sentiment_score: resp.sentiment_score,
      mentions_brand: resp.mentions_brand,
      cites_domain: resp.cites_domain,
      is_featured: resp.mentions_brand && resp.sentiment_score > 0.7,
      collected_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  const { data: responses, error: responsesError } = await supabase
    .from('responses')
    .insert(responseInserts)
    .select()

  if (responsesError) {
    console.error('Responses error:', responsesError)
    return
  }
  console.log('✓ Created', responses.length, 'responses')

  // 5. Create Sample Citations
  console.log('Creating citations...')
  const citableResponses = responses.filter(r => r.cites_domain)

  const citations = [
    { cited_domain: 'useluminari.com', cited_url: 'https://useluminari.com/features', citation_context: 'Luminari offers comprehensive AI visibility tracking' },
    { cited_domain: 'searchenginejournal.com', cited_url: 'https://searchenginejournal.com/geo-guide', citation_context: 'Guide to generative engine optimization' },
    { cited_domain: 'hubspot.com', cited_url: 'https://hubspot.com/ai-marketing', citation_context: 'AI marketing strategies' },
    { cited_domain: 'moz.com', cited_url: 'https://moz.com/ai-seo', citation_context: 'AI and SEO intersection' },
    { cited_domain: 'semrush.com', cited_url: 'https://semrush.com/blog/ai-visibility', citation_context: 'AI visibility monitoring guide' },
  ]

  const citationInserts = citations.map((c, i) => ({
    response_id: citableResponses[i % citableResponses.length].id,
    ...c
  }))

  const { data: insertedCitations, error: citationsError } = await supabase
    .from('citations')
    .insert(citationInserts)
    .select()

  if (citationsError) {
    console.error('Citations error:', citationsError)
    return
  }
  console.log('✓ Created', insertedCitations.length, 'citations')

  // 6. Create Visibility Metrics (Last 14 Days)
  console.log('Creating visibility metrics...')
  const today = new Date()
  const metricsInserts = []

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // Simulate improving visibility over time
    const baseScore = 25 + (14 - i) * 3 + Math.random() * 10

    metricsInserts.push({
      project_id: project.id,
      date: dateStr,
      visibility_score: Math.min(Math.round(baseScore * 10) / 10, 100),
      mention_count: Math.floor(2 + Math.random() * 5),
      citation_count: Math.floor(1 + Math.random() * 3),
      sentiment_avg: Math.round((0.5 + Math.random() * 0.4) * 100) / 100
    })
  }

  const { error: metricsError } = await supabase
    .from('visibility_metrics')
    .insert(metricsInserts)

  if (metricsError) {
    console.error('Metrics error:', metricsError)
    return
  }
  console.log('✓ Created 14 days of visibility metrics')

  // Summary
  console.log('\n✨ Seeding complete!\n')
  console.log('Summary:')
  console.log('  • Project: Luminari Demo')
  console.log('  • Monitor: AI Visibility Tools')
  console.log('  • Prompts: 5')
  console.log('  • Responses: 12 (across 5 AI models)')
  console.log('  • Citations: 5')
  console.log('  • Visibility Metrics: 14 days')
  console.log('\n🚀 Open http://localhost:3001 to see the populated dashboard!')
}

seed().catch(console.error)
