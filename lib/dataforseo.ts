// DataForSEO API Integration
// Docs: https://docs.dataforseo.com/

function getAuthHeader(): string {
  // Read env vars at runtime, not module load time
  const login = process.env.DATAFORSEO_LOGIN || '';
  const password = process.env.DATAFORSEO_PASSWORD || '';

  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }

  const credentials = Buffer.from(`${login}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

export interface KeywordData {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  difficulty?: number;
  intent?: string;
}

export interface SerpResult {
  keyword: string;
  position: number;
  url: string;
  title: string;
  domain: string;
}

export interface CompetitorKeyword {
  keyword: string;
  position: number;
  search_volume: number;
  traffic_share: number;
  url: string;
}

// Get keyword search volume and metrics
export async function getKeywordData(keywords: string[], location: number = 2840): Promise<KeywordData[]> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keywords: keywords.slice(0, 1000), // API limit: 1000 keywords per request
          location_code: location, // 2840 = United States
          language_code: 'en',
        }
      ]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.tasks?.[0]?.result) {
      return data.tasks[0].result.map((item: { keyword: string; search_volume: number; cpc: number; competition: number; }) => ({
        keyword: item.keyword,
        search_volume: item.search_volume || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
      }));
    }

    return [];
  } catch (error) {
    console.error('DataForSEO getKeywordData error:', error);
    throw error;
  }
}

// Get keyword difficulty scores
export async function getKeywordDifficulty(keywords: string[], location: number = 2840): Promise<Record<string, number>> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keywords: keywords.slice(0, 100), // API limit
          location_code: location,
          language_code: 'en',
          include_serp_info: false,
        }
      ]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();
    const difficulties: Record<string, number> = {};

    if (data.tasks?.[0]?.result) {
      for (const item of data.tasks[0].result) {
        if (item.keyword && item.keyword_info?.keyword_difficulty !== undefined) {
          difficulties[item.keyword] = item.keyword_info.keyword_difficulty;
        }
      }
    }

    return difficulties;
  } catch (error) {
    console.error('DataForSEO getKeywordDifficulty error:', error);
    throw error;
  }
}

// Get related keywords (keyword suggestions)
export async function getRelatedKeywords(seedKeyword: string, location: number = 2840, limit: number = 100): Promise<KeywordData[]> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keyword: seedKeyword,
          location_code: location,
          language_code: 'en',
          limit: limit,
        }
      ]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items.map((item: { keyword_data: { keyword: string; keyword_info: { search_volume: number; cpc: number; competition: number; keyword_difficulty: number; }; }; }) => ({
        keyword: item.keyword_data?.keyword || '',
        search_volume: item.keyword_data?.keyword_info?.search_volume || 0,
        cpc: item.keyword_data?.keyword_info?.cpc || 0,
        competition: item.keyword_data?.keyword_info?.competition || 0,
        difficulty: item.keyword_data?.keyword_info?.keyword_difficulty,
      })).filter((k: KeywordData) => k.keyword);
    }

    return [];
  } catch (error) {
    console.error('DataForSEO getRelatedKeywords error:', error);
    throw error;
  }
}

// Get SERP results for a keyword
export async function getSerpResults(keyword: string, location: number = 2840, limit: number = 100): Promise<SerpResult[]> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/regular', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keyword: keyword,
          location_code: location,
          language_code: 'en',
          device: 'desktop',
          depth: limit,
        }
      ]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items
        .filter((item: { type: string }) => item.type === 'organic')
        .map((item: { rank_group: number; url: string; title: string; domain: string }) => ({
          keyword: keyword,
          position: item.rank_group,
          url: item.url,
          title: item.title,
          domain: item.domain,
        }));
    }

    return [];
  } catch (error) {
    console.error('DataForSEO getSerpResults error:', error);
    throw error;
  }
}

// Get competitor domain keywords
export async function getCompetitorKeywords(domain: string, location: number = 2840, limit: number = 100): Promise<CompetitorKeyword[]> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          target: domain,
          location_code: location,
          language_code: 'en',
          limit: limit,
          order_by: ['keyword_data.keyword_info.search_volume,desc'],
        }
      ]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.tasks?.[0]?.result?.[0]?.items) {
      return data.tasks[0].result[0].items.map((item: { keyword_data: { keyword: string; keyword_info: { search_volume: number }; }; ranked_serp_element: { serp_item: { rank_group: number; url: string }; }; }) => ({
        keyword: item.keyword_data?.keyword || '',
        position: item.ranked_serp_element?.serp_item?.rank_group || 0,
        search_volume: item.keyword_data?.keyword_info?.search_volume || 0,
        traffic_share: 0, // Calculated separately if needed
        url: item.ranked_serp_element?.serp_item?.url || '',
      })).filter((k: CompetitorKeyword) => k.keyword);
    }

    return [];
  } catch (error) {
    console.error('DataForSEO getCompetitorKeywords error:', error);
    throw error;
  }
}

// Check API balance
export async function getApiBalance(): Promise<{ balance: number; currency: string }> {
  try {
    const response = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      balance: data.tasks?.[0]?.result?.[0]?.money?.balance || 0,
      currency: data.tasks?.[0]?.result?.[0]?.money?.currency || 'USD',
    };
  } catch (error) {
    console.error('DataForSEO getApiBalance error:', error);
    throw error;
  }
}
