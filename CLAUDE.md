# Luminari

Illuminate your AI visibility - A GEO (Generative Engine Optimization) monitoring platform for tracking brand visibility across AI platforms.

**Domain:** useluminari.com

## Stack
- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel

## Project Structure
```
/app
  layout.tsx          # Main layout with sidebar
  page.tsx            # Redirects to /dashboard
  /dashboard          # Main dashboard with charts
  /monitors           # Monitor management (CRUD)
  /monitors/[id]      # Monitor detail view
  /prompts            # Prompt tracking
  /responses          # AI response storage
  /citations          # Citation tracking
  /settings           # Project settings

/components
  /ui                 # shadcn/ui components
  /layout/Sidebar.tsx # Navigation sidebar
  /dashboard/         # Dashboard chart components
  providers.tsx       # TanStack Query provider

/lib
  supabase.ts         # Supabase client
  types.ts            # TypeScript interfaces
  utils.ts            # Utility functions (cn helper)

/hooks                # Custom React hooks (TBD)
```

## Rules
- Server Components by default (add 'use client' only when needed)
- No authentication required (internal tool)
- All database operations via Supabase client
- Mobile-responsive design
- Environment variables for secrets

## Database Schema
See the SQL schema in the project context. Key tables:
- `projects` - Tracked brands/projects
- `monitors` - AI monitoring configurations
- `prompts` - Prompts sent to AI models
- `responses` - AI model responses
- `citations` - Domain citations in responses
- `visibility_metrics` - Aggregated daily metrics

## AI Models Tracked
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Perplexity
- Copilot (Microsoft)

## Commands
```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Push database schema (requires Supabase CLI)
npx supabase db push
```

## Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Development Phase
**Foundation complete** - Ready for feature development

### Completed
- [x] Project setup with Next.js 14 App Router
- [x] Tailwind CSS + shadcn/ui configuration
- [x] Layout with collapsible sidebar
- [x] Dashboard with placeholder charts
- [x] Monitors list and detail pages
- [x] Prompts tracking page
- [x] Responses viewing page
- [x] Citations tracking page
- [x] Settings page
- [x] TypeScript types for all entities

### Next Steps
- [ ] Connect to Supabase database
- [ ] Implement data fetching with TanStack Query
- [ ] Add CRUD operations for monitors
- [ ] Add CRUD operations for prompts
- [ ] Implement AI response collection (backend)
- [ ] Real-time visibility score calculation
- [ ] Export/reporting features
