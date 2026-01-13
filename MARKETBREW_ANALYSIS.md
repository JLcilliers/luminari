# MarketBrew Feature Analysis for Luminari

## Executive Summary

This document captures key features and UX patterns from MarketBrew's GEO (Generative Engine Optimization) platform to inform Luminari's feature roadmap. MarketBrew positions itself as a "Self-Healing Website Pipeline" that automates content generation to improve AI visibility.

---

## Screenshots Captured

All screenshots are saved in `.playwright-mcp/` folder:
- `marketbrew-homepage.png` - Landing page
- `marketbrew-login.png` - Login screen
- `marketbrew-mission-control.png` - Main dashboard
- `marketbrew-brand-bible.png` - Brand configuration
- `marketbrew-content-booster-listing.png` - Content library listing
- `marketbrew-content-booster-detail.png` - Content detail view
- `marketbrew-content-setup.png` - Content generation setup
- `marketbrew-signals-config.png` - Signal sources configuration
- `marketbrew-ask-feature.png` - Ask (AI prompt monitoring)
- `marketbrew-listen-feature.png` - Listen (search monitoring)
- `marketbrew-visibility-launchpad.png` - Visibility Launchpad (Keywords tab)
- `marketbrew-visibility-launchpad-prompts.png` - Visibility Launchpad (Prompts tab)
- `marketbrew-keyword-fueler-mine.png` - Keyword Fueler (Mine tab)
- `marketbrew-keyword-fueler-plan.png` - Keyword Fueler (Plan tab)
- `marketbrew-keyword-fueler-compete.png` - Keyword Fueler (Compete tab)
- `marketbrew-settings-affiliate.png` - Settings (Affiliate Links)
- `marketbrew-settings-general.png` - Settings (General)
- `marketbrew-settings-notifications.png` - Settings (Email Notifications)

---

## Core Architecture: Self-Healing Website Pipeline

MarketBrew uses a 5-stage automated content pipeline displayed visually at the bottom of Mission Control:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  1. BRAND       │───▶│  2. SIGNAL      │───▶│  3. CONTENT GAP │───▶│  4. CONTENT     │───▶│  5. TESTING     │
│  BRIEFING       │    │  DETECTION      │    │  ANALYSIS       │    │  GENERATION     │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Brand Bible     │    │ Signal Sources  │    │ Visibility      │    │ Content Booster │    │ Ranking Sensors │
│ configuration   │    │ (Ask, Listen,   │    │ Launchpad       │    │ AI-generated    │    │ Track results   │
│                 │    │ Keyword Fueler) │    │                 │    │ content         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Health Score (0-100)
Mission Control displays a "Health Score" calculated from:
- Brand Briefing completion quality
- Keyword coverage percentage
- Content generation volume
- Content gap coverage rate
- Auto-generation activation status

---

## Feature Breakdown

### 1. Brand Bible (Brand Configuration)

**Purpose:** Central repository for brand identity used in all AI content generation.

**Key Fields:**
- Company/Product name
- Industry/category
- Target audience description
- Brand voice & tone guidelines
- Key differentiators
- Competitor list
- Important keywords/phrases

**Luminari Equivalent:** Currently in `projects` table with `tracked_brand` field. Needs expansion.

**Recommendation for Luminari:**
```typescript
// Expand projects table or create brand_config table
interface BrandConfig {
  id: string
  project_id: string
  company_name: string
  industry: string
  target_audience: string
  brand_voice: string  // e.g., "Professional", "Casual", "Technical"
  tone_guidelines: string
  key_differentiators: string[]
  competitor_names: string[]
  important_keywords: string[]
  created_at: Date
  updated_at: Date
}
```

---

### 2. Signal Sources

MarketBrew has 4 types of "signals" that feed into the content gap analysis:

#### 2.1 Ask (AI Prompt Monitoring)
**Purpose:** Monitor specific prompts across AI platforms to track brand visibility.

**Features:**
- Add custom prompts to monitor
- Track which AI models mention your brand
- See competitor mentions in responses
- Calculate visibility percentage per prompt

**Current Luminari Status:** Already implemented via `prompts` and `responses` tables.

#### 2.2 Listen (Search Intent Monitoring)
**Purpose:** Monitor traditional search queries and understand search intent.

**Features:**
- Add search terms to track
- Categorize by intent type (informational, commercial, transactional)
- Monitor SERP features and rankings
- Track related/suggested queries

**Recommendation for Luminari:** Add search monitoring alongside AI monitoring.

#### 2.3 Keyword Fueler (Multi-Source Keyword Research)
**Purpose:** Comprehensive keyword research tool with 3 approaches.

**Three Tabs:**

| Tab | Purpose | Data Source |
|-----|---------|-------------|
| **Mine** | View keywords you already rank for | Site's current rankings |
| **Plan** | Explore related keywords from seed terms | Keyword expansion API |
| **Compete** | Analyze competitor keywords | Competitor domain analysis |

**Mine Tab Metrics:**
- Total Ranking Keywords
- Top 10/20/100 distribution
- Position, Search Volume, Landing Page per keyword

**Compete Tab Features:**
- "Hero Keyword" input
- "Add Top 3 Competitors" auto-detection button
- Manual competitor URL entry (up to 3+)
- "Analyze Keywords" action

**Keyword Cart System:**
- Add keywords from any tab to cart
- Send cart to Visibility Launchpad for gap analysis

**Recommendation for Luminari:**
```typescript
interface KeywordResearch {
  id: string
  project_id: string
  keyword: string
  source: 'mine' | 'plan' | 'compete'
  position?: number
  search_volume?: number
  cpc?: number
  landing_page?: string
  competitor_source?: string
  added_to_launchpad: boolean
  created_at: Date
}
```

#### 2.4 Social Media Monitoring (EyesOver Integration)
**Purpose:** Monitor brand mentions across social platforms.

**Not deeply explored** - appears to be a third-party integration.

---

### 3. Visibility Launchpad

**Purpose:** Central hub that aggregates all signals and calculates content opportunities.

**Two Main Tabs:**

#### Keywords Tab
- Lists all tracked keywords
- Shows "Content Gap" percentage (how well current content matches target)
- "Launch Priority" score for prioritization
- Source filter dropdown (Ask, Listen, Keyword Fueler, etc.)
- Sortable columns: Keyword, Content Gap %, Launch Priority

#### Prompts Tab
- Lists all tracked AI prompts
- Shows visibility metrics per prompt
- Filter by source (Ask, etc.)
- Similar prioritization scoring

**Key Metrics Displayed:**
- **Content Gap %:** Percentage indicating how much content improvement is needed
- **Launch Priority:** Numerical score combining gap size, search volume, competition

**Recommendation for Luminari:**
Luminari's current "Create Content" page has similar gap analysis. Enhance with:
- Priority scoring algorithm
- Source filtering
- Content gap percentage calculation

---

### 4. Content Booster (Content Library)

**Purpose:** AI-generated content storage and management.

**Features:**
- List view of all generated content
- Status tracking (Draft, Published, etc.)
- Content type categorization
- Word count and SEO metrics
- Direct link to source prompt/keyword

**Current Luminari Status:** Implemented via `generated_content` table and `/content-library` page.

---

### 5. Settings

**Tabs Available:**
1. **Affiliate Links** - For white-label/reseller features
2. **API Access** - API credentials management
3. **General Settings:**
   - Login credentials
   - Time zone
   - Listing size (pagination)
   - Sensor retention period (e.g., 6 months)
4. **Boost Factor Hours** - Timing/scheduling settings
5. **Email Notification Settings:**
   - Blueprint Conversations
   - Website Crawls
   - Sensor Conversations
6. **Admin Settings** - Advanced admin options

**Recommendation for Luminari:**
Add settings page with:
- Data retention settings
- Notification preferences
- API key management (for future integrations)

---

## Key UX Patterns to Adopt

### 1. Visual Pipeline Progress
The horizontal pipeline visualization at the bottom of Mission Control is excellent UX for showing workflow status. Each stage is clickable to access that feature.

### 2. Health Score Dashboard Widget
Single number (0-100) with contributing factors breakdown helps users understand overall platform effectiveness.

### 3. Dual-List Picker for Notifications
The "Disabled → Enabled" list transfer pattern is intuitive for toggling options.

### 4. Keyword Cart Workflow
Adding keywords to a "cart" before sending to analysis is a smart pattern that prevents accidental additions and allows batch operations.

### 5. Tabbed Feature Organization
Complex features (Keyword Fueler, Settings) use tabs effectively to organize related sub-features without overwhelming users.

### 6. Source Attribution
Every item in Visibility Launchpad shows its source (Ask, Listen, etc.), making data provenance clear.

---

## Feature Priority Recommendations for Luminari

### High Priority (Core Differentiation)
1. **Brand Bible Enhancement** - Expand brand configuration for better AI content generation
2. **Visibility Launchpad Equivalent** - Enhance `/create-content` with priority scoring
3. **Health Score Dashboard** - Add overall visibility health metric to dashboard

### Medium Priority (Feature Parity)
4. **Keyword Research Integration** - Add "Mine/Plan/Compete" style keyword research
5. **Listen (Search Monitoring)** - Add traditional search monitoring alongside AI
6. **Settings Page** - Add user preferences, notifications, data retention

### Lower Priority (Nice to Have)
7. **Visual Pipeline** - Add workflow visualization
8. **Keyword Cart** - Batch keyword management before analysis
9. **Affiliate/White-label** - Future monetization feature

---

## Database Schema Recommendations

### New Tables

```sql
-- Brand configuration expansion
CREATE TABLE brand_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_name TEXT,
  industry TEXT,
  target_audience TEXT,
  brand_voice TEXT,
  tone_guidelines TEXT,
  key_differentiators TEXT[],
  important_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword research tracking
CREATE TABLE keyword_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('mine', 'plan', 'compete', 'manual')),
  position INT,
  search_volume INT,
  cpc DECIMAL(10,2),
  landing_page TEXT,
  competitor_source TEXT,
  content_gap_pct INT,
  launch_priority INT,
  added_to_analysis BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search monitoring (Listen feature)
CREATE TABLE search_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  intent_type TEXT CHECK (intent_type IN ('informational', 'commercial', 'transactional', 'navigational')),
  current_position INT,
  serp_features TEXT[],
  related_queries TEXT[],
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conclusion

MarketBrew provides a comprehensive GEO platform with strong automation features. Luminari already has solid foundations with prompt tracking and content generation. The key opportunities are:

1. **Enhance the content gap analysis** with priority scoring and source filtering
2. **Add brand configuration** for better AI-generated content
3. **Expand signal sources** to include search monitoring and keyword research
4. **Add a health score metric** to the dashboard for quick visibility assessment

The visual pipeline concept and health score gamification are particularly effective UX patterns worth adopting.
