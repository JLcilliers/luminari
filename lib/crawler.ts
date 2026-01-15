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
  | 'practice_area'
  | 'pricing'
  | 'features'
  | 'blog'
  | 'blog_post'
  | 'case_study'
  | 'documentation'
  | 'faq'
  | 'contact'
  | 'careers'
  | 'legal'
  | 'other';

export interface NavigationItem {
  text: string;
  href: string;
  isDropdown: boolean;
  children: NavigationItem[];
}

export interface ExtractedBrandInfo {
  logoText: string | null;
  titleBrandName: string | null;
  ogSiteName: string | null;
  schemaOrgName: string | null;
  footerCompanyName: string | null;
  aboutPageName: string | null;
  recommendedName: string;
  confidence: 'high' | 'medium' | 'low';
  domainBasedName: string;
}

export interface CrawlResult {
  domain: string;
  pagesCrawled: number;
  pages: CrawledPage[];
  sitemapFound: boolean;
  crawlDuration: number;
  aggregatedContent: AggregatedContent;
  navigation: NavigationItem[];
  brandInfo: ExtractedBrandInfo;
  blogInfo: BlogInfo;
  servicesInfo: ServicesInfo;
}

export interface BlogInfo {
  hasBlog: boolean;
  blogUrl: string | null;
  blogPosts: string[];
  blogTopics: string[];
}

export interface ServicesInfo {
  services: string[];
  practiceAreas: string[];
  serviceUrls: string[];
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
  navigationText: string;
}

const USER_AGENT = 'Luminari Brand Analyzer/1.0 (https://useluminari.com)';
const MAX_PAGES = 200;
const CONCURRENT_REQUESTS = 5;
const REQUEST_DELAY = 300;

// Priority order for crawling - expanded for law firms and service businesses
const PAGE_PRIORITY: Record<string, number> = {
  '/': 1,
  '/about': 2,
  '/about-us': 2,
  '/our-firm': 2,
  '/our-team': 2,
  '/products': 3,
  '/services': 3,
  '/practice-areas': 3,
  '/areas-of-practice': 3,
  '/what-we-do': 3,
  '/features': 4,
  '/pricing': 5,
  '/solutions': 6,
  '/platform': 6,
  '/how-it-works': 7,
  '/why': 7,
  '/customers': 8,
  '/case-studies': 8,
  '/results': 8,
  '/testimonials': 8,
  '/blog': 9,
  '/news': 9,
  '/articles': 9,
  '/insights': 9,
  '/resources': 9,
  '/team': 10,
  '/attorneys': 10,
  '/lawyers': 10,
  '/careers': 11,
  '/faq': 12,
  '/contact': 13,
};

// Blog detection patterns
const BLOG_PATTERNS = [
  '/blog', '/news', '/articles', '/insights', '/resources',
  '/posts', '/journal', '/updates', '/press', '/media'
];

const BLOG_NAV_KEYWORDS = [
  'blog', 'news', 'articles', 'insights', 'resources',
  'journal', 'updates', 'press', 'media', 'publications'
];

// Service/Practice area patterns
const SERVICE_PATTERNS = [
  '/services', '/practice-areas', '/areas-of-practice', '/what-we-do',
  '/expertise', '/specialties', '/capabilities', '/solutions'
];

const SERVICE_NAV_KEYWORDS = [
  'services', 'practice areas', 'areas of practice', 'what we do',
  'expertise', 'specialties', 'capabilities', 'solutions', 'our work'
];

export async function crawlWebsite(baseUrl: string): Promise<CrawlResult> {
  const startTime = Date.now();
  const domain = new URL(baseUrl).hostname;
  const crawledUrls = new Set<string>();
  const pages: CrawledPage[] = [];
  let sitemapFound = false;

  // Normalize base URL
  const normalizedBase = baseUrl.replace(/\/$/, '');

  // Step 1: Crawl homepage first to extract navigation and brand info
  const homepageCrawl = await crawlHomepage(normalizedBase);
  if (homepageCrawl) {
    pages.push(homepageCrawl.page);
    crawledUrls.add(normalizedBase);
  }

  const navigation = homepageCrawl?.navigation || [];
  const brandInfo = homepageCrawl?.brandInfo || createDefaultBrandInfo(domain);

  // Step 2: Try to get sitemap
  const sitemapUrls = await fetchSitemap(normalizedBase);
  if (sitemapUrls.length > 0) {
    sitemapFound = true;
    console.log(`Found sitemap with ${sitemapUrls.length} URLs`);
  }

  // Step 3: Build URL queue from sitemap + navigation
  let urlQueue: string[] = [];

  // Add navigation URLs (high priority)
  const navUrls = extractUrlsFromNavigation(navigation, normalizedBase);

  if (sitemapFound) {
    urlQueue = prioritizeUrls([...navUrls, ...sitemapUrls], normalizedBase);
  } else {
    // Start with navigation URLs + homepage links
    const homepageLinks = homepageCrawl?.page.links || [];
    urlQueue = prioritizeUrls([...navUrls, ...homepageLinks], normalizedBase);
  }

  // Step 4: Identify and prioritize blog/service pages
  const blogInfo = detectBlogFromNavigation(navigation, normalizedBase, urlQueue);
  const servicesInfo = detectServicesFromNavigation(navigation, normalizedBase, urlQueue);

  // Add blog posts to queue if found
  if (blogInfo.blogUrl && !crawledUrls.has(blogInfo.blogUrl)) {
    urlQueue.unshift(blogInfo.blogUrl);
  }

  // Add service/practice area pages to queue
  servicesInfo.serviceUrls.forEach(url => {
    if (!urlQueue.includes(url)) {
      urlQueue.unshift(url);
    }
  });

  // Step 5: Crawl pages
  while (urlQueue.length > 0 && pages.length < MAX_PAGES) {
    const batch = urlQueue.splice(0, CONCURRENT_REQUESTS);

    const results = await Promise.all(
      batch.map(async (url) => {
        if (crawledUrls.has(url)) return null;
        crawledUrls.add(url);

        try {
          const page = await crawlPage(url, normalizedBase);

          // Discover new links if no sitemap
          if (!sitemapFound && page) {
            const newUrls = page.links.filter(
              link => !crawledUrls.has(link) && !urlQueue.includes(link)
            );
            urlQueue.push(...prioritizeUrls(newUrls, normalizedBase));
          }

          // Track blog posts
          if (page?.pageType === 'blog_post' || page?.pageType === 'blog') {
            if (!blogInfo.blogPosts.includes(page.title)) {
              blogInfo.blogPosts.push(page.title);
            }
          }

          return page;
        } catch (error) {
          console.error(`Failed to crawl ${url}:`, error);
          return null;
        }
      })
    );

    pages.push(...results.filter((p): p is CrawledPage => p !== null));
    await delay(REQUEST_DELAY);
  }

  // Step 6: Try to get brand name from About page if not confident
  if (brandInfo.confidence !== 'high') {
    const aboutPage = pages.find(p => p.pageType === 'about');
    if (aboutPage) {
      const aboutBrandName = extractBrandNameFromAboutPage(aboutPage.content, aboutPage.headings);
      if (aboutBrandName) {
        brandInfo.aboutPageName = aboutBrandName;
        // Re-evaluate recommended name
        brandInfo.recommendedName = selectBestBrandName(brandInfo);
        brandInfo.confidence = 'high';
      }
    }
  }

  // Step 7: Extract blog topics from blog pages
  const blogPages = pages.filter(p => p.pageType === 'blog' || p.pageType === 'blog_post');
  blogInfo.blogTopics = extractBlogTopics(blogPages);
  blogInfo.hasBlog = blogPages.length > 0 || !!blogInfo.blogUrl;

  // Step 8: Extract services from service pages
  const servicePages = pages.filter(p => p.pageType === 'service' || p.pageType === 'practice_area');
  if (servicePages.length > 0) {
    servicePages.forEach(page => {
      const serviceNames = extractServiceNames(page);
      serviceNames.forEach(name => {
        if (!servicesInfo.services.includes(name) && !servicesInfo.practiceAreas.includes(name)) {
          if (page.pageType === 'practice_area') {
            servicesInfo.practiceAreas.push(name);
          } else {
            servicesInfo.services.push(name);
          }
        }
      });
    });
  }

  // Step 9: Aggregate content
  const aggregatedContent = aggregateContent(pages, navigation);

  return {
    domain,
    pagesCrawled: pages.length,
    pages,
    sitemapFound,
    crawlDuration: Date.now() - startTime,
    aggregatedContent,
    navigation,
    brandInfo,
    blogInfo,
    servicesInfo,
  };
}

async function crawlHomepage(baseUrl: string): Promise<{
  page: CrawledPage;
  navigation: NavigationItem[];
  brandInfo: ExtractedBrandInfo;
} | null> {
  try {
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract navigation
    const navigation = extractNavigation($, baseUrl);

    // Extract brand info
    const brandInfo = extractBrandInfo($, baseUrl);

    // Extract page content
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content');

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Store navigation HTML before removal
    const navHtml = $('nav').html() || '';

    $('script, style, nav, footer, header, aside, iframe, noscript').remove();

    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const urlObj = new URL(absoluteUrl);
        const baseObj = new URL(baseUrl);
        if (urlObj.hostname === baseObj.hostname) {
          const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
          if (!links.includes(cleanUrl)) {
            links.push(cleanUrl);
          }
        }
      } catch {
        // Invalid URL
      }
    });

    return {
      page: {
        url: baseUrl,
        title,
        pageType: 'homepage',
        content,
        headings,
        links,
        metaDescription,
        crawledAt: new Date(),
      },
      navigation,
      brandInfo,
    };
  } catch (error) {
    console.error('Error crawling homepage:', error);
    return null;
  }
}

function extractNavigation($: cheerio.CheerioAPI, baseUrl: string): NavigationItem[] {
  const navigation: NavigationItem[] = [];

  // Find main navigation - try multiple selectors
  const navSelectors = [
    'nav[role="navigation"]',
    'header nav',
    'nav.main-nav',
    'nav.primary-nav',
    'nav#main-nav',
    '.main-navigation',
    '#navigation',
    'nav',
  ];

  let navElement: ReturnType<typeof $> | null = null;

  for (const selector of navSelectors) {
    const found = $(selector).first();
    if (found.length > 0) {
      navElement = found;
      break;
    }
  }

  if (!navElement) return navigation;

  // Extract top-level navigation items
  navElement.find('> ul > li, > div > ul > li, > div > a, > a').each((_, el) => {
    const item = extractNavItem($, $(el), baseUrl);
    if (item) {
      navigation.push(item);
    }
  });

  // If no items found, try finding all direct links
  if (navigation.length === 0) {
    navElement.find('a').each((_, el) => {
      const $link = $(el);
      const text = $link.text().trim();
      const href = $link.attr('href');

      if (text && href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          navigation.push({
            text,
            href: absoluteUrl,
            isDropdown: false,
            children: [],
          });
        } catch {
          // Invalid URL
        }
      }
    });
  }

  return navigation;
}

function extractNavItem($: cheerio.CheerioAPI, $el: ReturnType<typeof $>, baseUrl: string): NavigationItem | null {
  const $link = $el.is('a') ? $el : $el.find('a').first();
  const text = $link.text().trim().split('\n')[0].trim(); // Get first line only
  const href = $link.attr('href');

  if (!text) return null;

  let absoluteUrl = '';
  if (href) {
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      absoluteUrl = href;
    }
  }

  // Check for dropdown children
  const children: NavigationItem[] = [];
  const $dropdown = $el.find('ul, .dropdown-menu, .sub-menu');

  if ($dropdown.length > 0) {
    $dropdown.find('> li > a, > a').each((_, childEl) => {
      const childText = $(childEl).text().trim();
      const childHref = $(childEl).attr('href');

      if (childText && childHref) {
        try {
          const childUrl = new URL(childHref, baseUrl).toString();
          children.push({
            text: childText,
            href: childUrl,
            isDropdown: false,
            children: [],
          });
        } catch {
          // Invalid URL
        }
      }
    });
  }

  return {
    text,
    href: absoluteUrl,
    isDropdown: children.length > 0,
    children,
  };
}

function extractBrandInfo($: cheerio.CheerioAPI, baseUrl: string): ExtractedBrandInfo {
  const domain = new URL(baseUrl).hostname;
  const domainBasedName = domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|law|legal)$/, '')
    .split(/[.-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // 1. Logo alt text or aria-label
  let logoText: string | null = null;
  const logoSelectors = [
    'header .logo img',
    'header img.logo',
    '.site-logo img',
    '#logo img',
    'a.logo img',
    '.navbar-brand img',
    'header a img',
  ];

  for (const selector of logoSelectors) {
    const $logo = $(selector).first();
    if ($logo.length > 0) {
      logoText = $logo.attr('alt')?.trim() || null;
      if (logoText && logoText.length > 2 && !logoText.toLowerCase().includes('logo')) {
        break;
      }
      logoText = null;
    }
  }

  // Also check parent link for aria-label
  if (!logoText) {
    const $logoLink = $('header a[aria-label]').first();
    if ($logoLink.length > 0) {
      logoText = $logoLink.attr('aria-label')?.trim() || null;
    }
  }

  // 2. Title tag (before separator)
  let titleBrandName: string | null = null;
  const title = $('title').text().trim();
  if (title) {
    // Common separators: |, -, –, —, :
    const separators = /\s*[\|–—\-:]\s*/;
    const parts = title.split(separators);
    if (parts.length > 1) {
      // Usually brand name is at the end
      const lastPart = parts[parts.length - 1].trim();
      const firstPart = parts[0].trim();

      // If last part looks like a brand name (not too long, not a page description)
      if (lastPart.length > 2 && lastPart.length < 50 && !lastPart.toLowerCase().includes('home')) {
        titleBrandName = lastPart;
      } else if (firstPart.length > 2 && firstPart.length < 50) {
        titleBrandName = firstPart;
      }
    }
  }

  // 3. og:site_name
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim() || null;

  // 4. Schema.org Organization name
  let schemaOrgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      if (json['@type'] === 'Organization' || json['@type'] === 'LocalBusiness' || json['@type'] === 'LegalService') {
        schemaOrgName = json.name || null;
      }
      // Check for nested organization
      if (json.publisher?.['@type'] === 'Organization') {
        schemaOrgName = json.publisher.name || schemaOrgName;
      }
    } catch {
      // Invalid JSON
    }
  });

  // 5. Footer company name
  let footerCompanyName: string | null = null;
  const $footer = $('footer');
  if ($footer.length > 0) {
    // Look for copyright text
    const footerText = $footer.text();
    const copyrightMatch = footerText.match(/©\s*\d{4}\s+([^.|\n]+)/i) ||
                          footerText.match(/copyright\s*\d{4}\s+([^.|\n]+)/i);
    if (copyrightMatch) {
      footerCompanyName = copyrightMatch[1].trim()
        .replace(/[,.]?\s*(all rights reserved|inc|llc|ltd|llp|pllc|pc|p\.c\.).*$/i, '')
        .trim();
    }
  }

  // Select best brand name
  const brandInfo: ExtractedBrandInfo = {
    logoText,
    titleBrandName,
    ogSiteName,
    schemaOrgName,
    footerCompanyName,
    aboutPageName: null,
    recommendedName: '',
    confidence: 'low',
    domainBasedName,
  };

  brandInfo.recommendedName = selectBestBrandName(brandInfo);
  brandInfo.confidence = determineBrandNameConfidence(brandInfo);

  return brandInfo;
}

function selectBestBrandName(info: ExtractedBrandInfo): string {
  // Priority order:
  // 1. Schema.org name (most reliable)
  // 2. og:site_name
  // 3. Logo text (if not generic)
  // 4. Footer company name
  // 5. Title brand name
  // 6. About page name
  // 7. Domain-based name (last resort)

  const candidates = [
    info.schemaOrgName,
    info.ogSiteName,
    info.logoText,
    info.footerCompanyName,
    info.titleBrandName,
    info.aboutPageName,
  ].filter(Boolean) as string[];

  // Validate candidates - reject if too similar to domain
  for (const candidate of candidates) {
    if (!isDomainBased(candidate, info.domainBasedName)) {
      return candidate;
    }
  }

  // All candidates look domain-based, return the most detailed one
  if (candidates.length > 0) {
    // Sort by length (longer = more likely to be full name)
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  return info.domainBasedName;
}

function isDomainBased(name: string, domainName: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedDomain = domainName.toLowerCase().replace(/[^a-z]/g, '');

  // Check if name is essentially the domain
  return normalized === normalizedDomain ||
         normalized.replace(/law|legal|group|firm/g, '') === normalizedDomain.replace(/law|legal|group|firm/g, '');
}

function determineBrandNameConfidence(info: ExtractedBrandInfo): 'high' | 'medium' | 'low' {
  // High confidence: Schema.org or multiple sources agree
  if (info.schemaOrgName) return 'high';

  const sources = [info.ogSiteName, info.logoText, info.footerCompanyName, info.titleBrandName]
    .filter(Boolean);

  if (sources.length >= 2) {
    // Check if at least 2 sources roughly match
    const normalized = sources.map(s => s!.toLowerCase().replace(/[^a-z]/g, ''));
    const matches = normalized.filter((s, i) =>
      normalized.some((other, j) => i !== j && (s.includes(other) || other.includes(s)))
    );
    if (matches.length >= 2) return 'high';
    return 'medium';
  }

  if (sources.length === 1 && !isDomainBased(sources[0]!, info.domainBasedName)) {
    return 'medium';
  }

  return 'low';
}

function extractBrandNameFromAboutPage(content: string, headings: string[]): string | null {
  // Look for patterns like "About [Company Name]" or "[Company Name] is..."
  const patterns = [
    /about\s+([A-Z][A-Za-z\s&,']+?)(?:\s*[-–|]|\s+is|\s+was|\s+has|\.|$)/i,
    /([A-Z][A-Za-z\s&,']+?)\s+is\s+a\s+(?:leading|premier|top|trusted|experienced)/i,
    /welcome\s+to\s+([A-Z][A-Za-z\s&,']+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 60) {
        return name;
      }
    }
  }

  // Check first H1/H2 that looks like a company name
  for (const heading of headings.slice(0, 5)) {
    if (heading.length > 3 && heading.length < 60 &&
        !heading.toLowerCase().includes('about') &&
        !heading.toLowerCase().includes('our team')) {
      return heading;
    }
  }

  return null;
}

function createDefaultBrandInfo(domain: string): ExtractedBrandInfo {
  const domainBasedName = domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|law|legal)$/, '')
    .split(/[.-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    logoText: null,
    titleBrandName: null,
    ogSiteName: null,
    schemaOrgName: null,
    footerCompanyName: null,
    aboutPageName: null,
    recommendedName: domainBasedName,
    confidence: 'low',
    domainBasedName,
  };
}

function extractUrlsFromNavigation(navigation: NavigationItem[], baseUrl: string): string[] {
  const urls: string[] = [];

  function extractRecursive(items: NavigationItem[]) {
    for (const item of items) {
      if (item.href && item.href.startsWith(baseUrl)) {
        urls.push(item.href);
      }
      if (item.children.length > 0) {
        extractRecursive(item.children);
      }
    }
  }

  extractRecursive(navigation);
  return urls;
}

function detectBlogFromNavigation(
  navigation: NavigationItem[],
  baseUrl: string,
  allUrls: string[]
): BlogInfo {
  const blogInfo: BlogInfo = {
    hasBlog: false,
    blogUrl: null,
    blogPosts: [],
    blogTopics: [],
  };

  // Check navigation for blog links
  function searchNav(items: NavigationItem[]): string | null {
    for (const item of items) {
      const textLower = item.text.toLowerCase();

      if (BLOG_NAV_KEYWORDS.some(kw => textLower.includes(kw))) {
        return item.href;
      }

      if (item.children.length > 0) {
        const childResult = searchNav(item.children);
        if (childResult) return childResult;
      }
    }
    return null;
  }

  blogInfo.blogUrl = searchNav(navigation);

  // If not found in nav, check URL patterns
  if (!blogInfo.blogUrl) {
    for (const url of allUrls) {
      const pathname = new URL(url).pathname.toLowerCase();
      if (BLOG_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
        blogInfo.blogUrl = url;
        break;
      }
    }
  }

  blogInfo.hasBlog = !!blogInfo.blogUrl;
  return blogInfo;
}

function detectServicesFromNavigation(
  navigation: NavigationItem[],
  baseUrl: string,
  allUrls: string[]
): ServicesInfo {
  const servicesInfo: ServicesInfo = {
    services: [],
    practiceAreas: [],
    serviceUrls: [],
  };

  // Check navigation for service/practice area links
  function searchNav(items: NavigationItem[]) {
    for (const item of items) {
      const textLower = item.text.toLowerCase();

      // Check if this is a services/practice areas dropdown
      if (SERVICE_NAV_KEYWORDS.some(kw => textLower.includes(kw))) {
        if (item.href) {
          servicesInfo.serviceUrls.push(item.href);
        }

        // Add all children as services/practice areas
        for (const child of item.children) {
          const serviceName = child.text.trim();
          if (serviceName && serviceName.length > 2) {
            // Determine if it's a practice area (legal) or general service
            if (textLower.includes('practice') || textLower.includes('area')) {
              servicesInfo.practiceAreas.push(serviceName);
            } else {
              servicesInfo.services.push(serviceName);
            }

            if (child.href) {
              servicesInfo.serviceUrls.push(child.href);
            }
          }
        }
      }

      // Recursively check children
      if (item.children.length > 0) {
        searchNav(item.children);
      }
    }
  }

  searchNav(navigation);

  // If no services found in nav, check URL patterns
  if (servicesInfo.services.length === 0 && servicesInfo.practiceAreas.length === 0) {
    for (const url of allUrls) {
      const pathname = new URL(url).pathname.toLowerCase();
      if (SERVICE_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
        servicesInfo.serviceUrls.push(url);
      }
    }
  }

  return servicesInfo;
}

function extractBlogTopics(blogPages: CrawledPage[]): string[] {
  const topics: string[] = [];

  for (const page of blogPages) {
    // Extract from headings
    for (const heading of page.headings.slice(0, 3)) {
      if (heading.length > 5 && heading.length < 100 && !topics.includes(heading)) {
        topics.push(heading);
      }
    }
  }

  return topics.slice(0, 20);
}

function extractServiceNames(page: CrawledPage): string[] {
  const names: string[] = [];

  // Use page title (often contains service name)
  if (page.title) {
    const cleanTitle = page.title.split(/[\|–—\-:]/)[0].trim();
    if (cleanTitle.length > 3 && cleanTitle.length < 60) {
      names.push(cleanTitle);
    }
  }

  // First H1 is often the service name
  if (page.headings.length > 0) {
    const h1 = page.headings[0];
    if (h1.length > 3 && h1.length < 60 && !names.includes(h1)) {
      names.push(h1);
    }
  }

  return names;
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
  const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);

  for (const match of locMatches) {
    const url = match[1].trim();

    if (url.endsWith('.xml')) continue;

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

    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || undefined;

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000) || '';

    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, url).toString();
        const urlObj = new URL(absoluteUrl);
        const baseObj = new URL(baseUrl);

        if (urlObj.hostname === baseObj.hostname) {
          const cleanUrl = `${urlObj.origin}${urlObj.pathname}`;
          if (!links.includes(cleanUrl)) {
            links.push(cleanUrl);
          }
        }
      } catch {
        // Invalid URL
      }
    });

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
  if (pathname.includes('/about') || pathname.includes('/company') || pathname.includes('/our-firm')) return 'about';

  // Practice areas (for law firms)
  if (pathname.includes('/practice-area') || pathname.includes('/areas-of-practice')) return 'practice_area';

  // Individual practice area pages
  if (pathname.match(/\/(employment|personal-injury|medical-malpractice|car-accident|truck-accident|wrongful-death|sexual-harassment|discrimination|child-abuse|sex-abuse)/)) {
    return 'practice_area';
  }

  if (pathname.includes('/product') || pathname.includes('/platform')) return 'product';
  if (pathname.includes('/service')) return 'service';
  if (pathname.includes('/pricing') || pathname.includes('/plans')) return 'pricing';
  if (pathname.includes('/feature')) return 'features';

  // Blog detection - check both pathname AND position in URL
  if (pathname.includes('/blog') || pathname.includes('/news') || pathname.includes('/article') || pathname.includes('/insights')) {
    // If it's exactly /blog or /news, it's the main blog page
    if (pathname.match(/^\/(blog|news|articles|insights)\/?$/)) {
      return 'blog';
    }
    // Otherwise it's a blog post
    return 'blog_post';
  }

  if (pathname.includes('/case-stud') || pathname.includes('/customer-stor')) return 'case_study';
  if (pathname.includes('/doc') || pathname.includes('/guide') || pathname.includes('/help')) return 'documentation';
  if (pathname.includes('/faq')) return 'faq';
  if (pathname.includes('/contact')) return 'contact';
  if (pathname.includes('/career') || pathname.includes('/job')) return 'careers';
  if (pathname.includes('/privacy') || pathname.includes('/terms') || pathname.includes('/legal')) return 'legal';

  // Check title and content for service/practice area indicators
  if (allText.includes('practice area') || allText.includes('area of practice')) return 'practice_area';
  if (allText.includes('attorney') || allText.includes('lawyer') || allText.includes('legal service')) return 'service';
  if (allText.includes('pricing') || allText.includes('plans') || allText.includes('subscription')) return 'pricing';
  if (allText.includes('about us') || allText.includes('our story') || allText.includes('who we are')) return 'about';
  if (allText.includes('feature') || allText.includes('capability')) return 'features';
  if (allText.includes('case study') || allText.includes('success story')) return 'case_study';
  if (allText.includes('documentation') || allText.includes('api reference')) return 'documentation';
  if (allText.includes('faq') || allText.includes('frequently asked')) return 'faq';

  return 'other';
}

function aggregateContent(pages: CrawledPage[], navigation: NavigationItem[]): AggregatedContent {
  const byType: Record<PageType, CrawledPage[]> = {
    homepage: [],
    about: [],
    product: [],
    service: [],
    practice_area: [],
    pricing: [],
    features: [],
    blog: [],
    blog_post: [],
    case_study: [],
    documentation: [],
    faq: [],
    contact: [],
    careers: [],
    legal: [],
    other: [],
  };

  pages.forEach(page => {
    byType[page.pageType].push(page);
  });

  const getContent = (types: PageType[], maxLength: number = 5000): string => {
    const pagesOfType = types.flatMap(t => byType[t]);
    const content = pagesOfType.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    return content.slice(0, maxLength);
  };

  // Generate navigation text summary
  const navigationText = generateNavigationText(navigation);

  return {
    companyInfo: getContent(['homepage', 'about'], 4000),
    productsAndServices: getContent(['product', 'service', 'practice_area', 'features'], 6000),
    valuePropositions: getContent(['homepage', 'features', 'product'], 3000),
    targetAudience: getContent(['homepage', 'about', 'case_study'], 3000),
    blogTopics: getContent(['blog', 'blog_post'], 4000),
    pricingInfo: getContent(['pricing'], 2000),
    teamInfo: getContent(['about', 'careers'], 2000),
    allHeadings: pages.flatMap(p => p.headings).slice(0, 100),
    allContent: pages.map(p => `### ${p.title} (${p.pageType})\n${p.content.slice(0, 500)}`).join('\n\n'),
    navigationText,
  };
}

function generateNavigationText(navigation: NavigationItem[]): string {
  const lines: string[] = [];

  function processItem(item: NavigationItem, depth: number = 0) {
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- ${item.text}`);

    for (const child of item.children) {
      processItem(child, depth + 1);
    }
  }

  for (const item of navigation) {
    processItem(item);
  }

  return lines.join('\n');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
