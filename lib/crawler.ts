import * as cheerio from 'cheerio';

export interface CrawledPage {
  url: string;
  title: string;
  pageType: PageType;
  content: string;
  headings: string[];
  links: string[];
  metaDescription?: string;
  crawledAt: Date;
}

export type PageType =
  | 'homepage'
  | 'about'
  | 'product'
  | 'service'
  | 'pricing'
  | 'features'
  | 'blog'
  | 'case_study'
  | 'documentation'
  | 'faq'
  | 'contact'
  | 'careers'
  | 'legal'
  | 'other';

export interface CrawlResult {
  domain: string;
  pagesCrawled: number;
  pages: CrawledPage[];
  sitemapFound: boolean;
  crawlDuration: number;
  aggregatedContent: AggregatedContent;
}

export interface AggregatedContent {
  companyInfo: string;
  productsAndServices: string;
  valuePropositions: string;
  targetAudience: string;
  blogTopics: string;
  pricingInfo: string;
  teamInfo: string;
  allHeadings: string[];
  allContent: string;
}

const USER_AGENT = 'Luminari Brand Analyzer/1.0 (https://useluminari.com)';
const MAX_PAGES = 50;
const CONCURRENT_REQUESTS = 2;
const REQUEST_DELAY = 500; // ms between requests

// Priority order for crawling
const PAGE_PRIORITY: Record<string, number> = {
  '/': 1,
  '/about': 2,
  '/about-us': 2,
  '/products': 3,
  '/services': 3,
  '/features': 4,
  '/pricing': 5,
  '/solutions': 6,
  '/platform': 6,
  '/how-it-works': 7,
  '/why': 7,
  '/customers': 8,
  '/case-studies': 8,
  '/blog': 9,
  '/resources': 9,
  '/team': 10,
  '/careers': 11,
  '/faq': 12,
  '/contact': 13,
};

export async function crawlWebsite(baseUrl: string): Promise<CrawlResult> {
  const startTime = Date.now();
  const domain = new URL(baseUrl).hostname;
  const crawledUrls = new Set<string>();
  const pages: CrawledPage[] = [];
  let sitemapFound = false;

  // Normalize base URL
  const normalizedBase = baseUrl.replace(/\/$/, '');

  // Step 1: Try to get sitemap
  const sitemapUrls = await fetchSitemap(normalizedBase);
  if (sitemapUrls.length > 0) {
    sitemapFound = true;
    console.log(`Found sitemap with ${sitemapUrls.length} URLs`);
  }

  // Step 2: Build URL queue
  let urlQueue: string[] = [];

  if (sitemapFound) {
    // Filter and prioritize sitemap URLs
    urlQueue = prioritizeUrls(sitemapUrls, normalizedBase);
  } else {
    // Start with homepage and discover links
    urlQueue = [normalizedBase];
  }

  // Step 3: Crawl pages
  while (urlQueue.length > 0 && pages.length < MAX_PAGES) {
    // Take batch for concurrent processing
    const batch = urlQueue.splice(0, CONCURRENT_REQUESTS);

    const results = await Promise.all(
      batch.map(async (url) => {
        if (crawledUrls.has(url)) return null;
        crawledUrls.add(url);

        try {
          const page = await crawlPage(url, normalizedBase);

          // If not using sitemap, discover new links
          if (!sitemapFound && page) {
            const newUrls = page.links.filter(
              link => !crawledUrls.has(link) && !urlQueue.includes(link)
            );
            urlQueue.push(...prioritizeUrls(newUrls, normalizedBase));
          }

          return page;
        } catch (error) {
          console.error(`Failed to crawl ${url}:`, error);
          return null;
        }
      })
    );

    pages.push(...results.filter((p): p is CrawledPage => p !== null));

    // Rate limiting
    await delay(REQUEST_DELAY);
  }

  // Step 4: Aggregate content by category
  const aggregatedContent = aggregateContent(pages);

  return {
    domain,
    pagesCrawled: pages.length,
    pages,
    sitemapFound,
    crawlDuration: Date.now() - startTime,
    aggregatedContent,
  };
}

async function fetchSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const urls = parseSitemap(xml, baseUrl);

      if (urls.length > 0) return urls;
    } catch {
      continue;
    }
  }

  return [];
}

function parseSitemap(xml: string, baseUrl: string): string[] {
  const urls: string[] = [];

  // Match <loc> tags in sitemap
  const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);

  for (const match of locMatches) {
    const url = match[1].trim();

    // Check if it's a sitemap index (contains other sitemaps)
    if (url.endsWith('.xml')) {
      // For simplicity, we'll skip nested sitemaps
      // In production, you'd recursively fetch them
      continue;
    }

    // Only include URLs from the same domain
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      if (urlObj.hostname === baseObj.hostname) {
        urls.push(url);
      }
    } catch {
      continue;
    }
  }

  return urls;
}

function prioritizeUrls(urls: string[], baseUrl: string): string[] {
  return urls
    .map(url => {
      try {
        const pathname = new URL(url).pathname.toLowerCase();
        const priority = Object.entries(PAGE_PRIORITY).find(
          ([path]) => pathname === path || pathname.startsWith(path + '/')
        )?.[1] || 100;
        return { url, priority };
      } catch {
        return { url, priority: 100 };
      }
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_PAGES)
    .map(item => item.url);
}

async function crawlPage(url: string, baseUrl: string): Promise<CrawledPage | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || '';

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || undefined;

    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Remove scripts, styles, nav, footer for content extraction
    $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

    // Get text content
    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000) || '';

    // Extract internal links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, url).toString();
        const urlObj = new URL(absoluteUrl);
        const baseObj = new URL(baseUrl);

        // Only internal links
        if (urlObj.hostname === baseObj.hostname) {
          // Remove hash and query
          const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
          if (!links.includes(cleanUrl)) {
            links.push(cleanUrl);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Determine page type
    const pageType = classifyPage(url, title, content, headings);

    return {
      url,
      title,
      pageType,
      content,
      headings,
      links,
      metaDescription,
      crawledAt: new Date(),
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  }
}

function classifyPage(url: string, title: string, content: string, headings: string[]): PageType {
  const pathname = new URL(url).pathname.toLowerCase();
  const titleLower = title.toLowerCase();
  const allText = `${pathname} ${titleLower} ${headings.join(' ').toLowerCase()}`;

  // Check pathname first
  if (pathname === '/' || pathname === '') return 'homepage';
  if (pathname.includes('/about') || pathname.includes('/company')) return 'about';
  if (pathname.includes('/product') || pathname.includes('/platform')) return 'product';
  if (pathname.includes('/service')) return 'service';
  if (pathname.includes('/pricing') || pathname.includes('/plans')) return 'pricing';
  if (pathname.includes('/feature')) return 'features';
  if (pathname.includes('/blog') || pathname.includes('/news') || pathname.includes('/article')) return 'blog';
  if (pathname.includes('/case-stud') || pathname.includes('/customer-stor')) return 'case_study';
  if (pathname.includes('/doc') || pathname.includes('/guide') || pathname.includes('/help')) return 'documentation';
  if (pathname.includes('/faq')) return 'faq';
  if (pathname.includes('/contact')) return 'contact';
  if (pathname.includes('/career') || pathname.includes('/job')) return 'careers';
  if (pathname.includes('/privacy') || pathname.includes('/terms') || pathname.includes('/legal')) return 'legal';

  // Check title and content
  if (allText.includes('pricing') || allText.includes('plans') || allText.includes('subscription')) return 'pricing';
  if (allText.includes('about us') || allText.includes('our story') || allText.includes('who we are')) return 'about';
  if (allText.includes('feature') || allText.includes('capability')) return 'features';
  if (allText.includes('case study') || allText.includes('success story')) return 'case_study';
  if (allText.includes('documentation') || allText.includes('api reference')) return 'documentation';
  if (allText.includes('faq') || allText.includes('frequently asked')) return 'faq';

  return 'other';
}

function aggregateContent(pages: CrawledPage[]): AggregatedContent {
  const byType: Record<PageType, CrawledPage[]> = {
    homepage: [],
    about: [],
    product: [],
    service: [],
    pricing: [],
    features: [],
    blog: [],
    case_study: [],
    documentation: [],
    faq: [],
    contact: [],
    careers: [],
    legal: [],
    other: [],
  };

  // Group pages by type
  pages.forEach(page => {
    byType[page.pageType].push(page);
  });

  // Aggregate content by category
  const getContent = (types: PageType[], maxLength: number = 5000): string => {
    const pagesOfType = types.flatMap(t => byType[t]);
    const content = pagesOfType.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    return content.slice(0, maxLength);
  };

  return {
    companyInfo: getContent(['homepage', 'about'], 4000),
    productsAndServices: getContent(['product', 'service', 'features'], 5000),
    valuePropositions: getContent(['homepage', 'features', 'product'], 3000),
    targetAudience: getContent(['homepage', 'about', 'case_study'], 3000),
    blogTopics: getContent(['blog'], 3000),
    pricingInfo: getContent(['pricing'], 2000),
    teamInfo: getContent(['about', 'careers'], 2000),
    allHeadings: pages.flatMap(p => p.headings).slice(0, 100),
    allContent: pages.map(p => `### ${p.title} (${p.pageType})\n${p.content.slice(0, 500)}`).join('\n\n'),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
